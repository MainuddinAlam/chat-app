package main

import (
    "context"
    "fmt"
    "log"
    "net/http"
    "os"
    "sync"
    
    "github.com/gorilla/websocket"
    "github.com/jackc/pgx/v5"
)

// WebSocket upgrader so browsers can connect to our Go server
var upgrader = websocket.Upgrader{
    CheckOrigin: func(r *http.Request) bool { return true },
}

var db *pgx.Conn

type Hub struct {
    clients map[string]*websocket.Conn
    mu      sync.Mutex
}

var hub = Hub{
    clients: make(map[string]*websocket.Conn),
}

// Message structure matching what our frontend will send/receive
type Message struct {
    Sender   string `json:"sender"`
    Receiver string `json:"receiver"`
    Content  string `json:"content"`
    Type     string `json:"type"` // "register", "message", or "history"
}

func handleWebSocket(w http.ResponseWriter, r *http.Request) {
    ws, err := upgrader.Upgrade(w, r, nil)
    if err != nil {
        log.Println("WebSocket upgrade error:", err)
        return
    }
    defer ws.Close()

    var currentUserID string

    for {
        var msg Message
        err := ws.ReadJSON(&msg)
        if err != nil {
            log.Println("Error reading JSON:", err)
            // Remove user from active hub when they disconnect
            if currentUserID != "" {
                hub.mu.Lock()
                delete(hub.clients, currentUserID)
                hub.mu.Unlock()
                log.Printf("User unregistered: %s\n", currentUserID)
            }
            break
        }

        // 1. Handle user registration and fetch chat history from Supabase
        if msg.Type == "register" {
            currentUserID = msg.Sender
            hub.mu.Lock()
            hub.clients[currentUserID] = ws
            hub.mu.Unlock()
            log.Printf("User registered online: %s (Chatting with: %s)\n", currentUserID, msg.Receiver)

            // Query Supabase for past messages between sender and receiver
            ctx := context.Background()
            rows, err := db.Query(ctx,
                `SELECT sender, receiver, content FROM messages 
                 WHERE (sender = $1 AND receiver = $2) OR (sender = $2 AND receiver = $1) 
                 ORDER BY id ASC`,
                msg.Sender, msg.Receiver,
            )
            if err != nil {
                log.Printf("Error fetching chat history from Supabase: %v\n", err)
                continue
            }

            var history []Message
            for rows.Next() {
                var m Message
                if err := rows.Scan(&m.Sender, &m.Receiver, &m.Content); err != nil {
                    log.Printf("Error scanning message row: %v\n", err)
                    continue
                }
                m.Type = "message"
                history = append(history, m)
            }
            rows.Close() // Close rows safely here

            // Ensure history encodes as an empty array [] instead of null if no rows exist
            if history == nil {
                history = []Message{}
            }

            // Send history payload back to the newly connected client
            historyPayload := map[string]interface{}{
                "type":     "history",
                "messages": history,
            }

            if err := ws.WriteJSON(historyPayload); err != nil {
                log.Printf("Error sending history to client: %v\n", err)
                break
            }
            continue
        }
        
        // 2. Handle actual chat messages
        if msg.Type == "message" {
            log.Printf("Message from %s to %s: %s\n", msg.Sender, msg.Receiver, msg.Content)

            // Save message to Supabase database permanently
            ctx := context.Background()
            _, err := db.Exec(ctx, 
                "INSERT INTO messages (sender, receiver, content) VALUES ($1, $2, $3)", 
                msg.Sender, msg.Receiver, msg.Content,
            )
            if err != nil {
                log.Printf("Failed to save message to database: %v\n", err)
            }

            // 3. Route message to receiver if they are online
            hub.mu.Lock()
            receiverConn, receiverOnline := hub.clients[msg.Receiver]
            senderConn, senderOnline := hub.clients[msg.Sender]
            hub.mu.Unlock()

            if receiverOnline {
                receiverConn.WriteJSON(msg)
            }
            if senderOnline {
                senderConn.WriteJSON(msg) // Echo back to sender so their chat updates too
            }
        }
    }
}

func main() {
    ctx := context.Background()
    
    dbURL := os.Getenv("DB_URL")
    if dbURL == "" {
        log.Fatal("DB_URL environment variable is not set")
    }
    var err error

    db, err = pgx.Connect(ctx, dbURL)
    if err != nil {
        log.Fatalf("Unable to connect to database: %v\n", err)
    }
    defer db.Close(ctx)

    fmt.Println("Successfully connected to Supabase PostgreSQL!")
    
    http.HandleFunc("/ws", handleWebSocket)
    
    port := os.Getenv("PORT")
    if port == "" {
        port = ":8080"
    }
    fmt.Printf("Go backend server running on http://localhost%s\n", port)
    log.Fatal(http.ListenAndServe(port, nil))
}