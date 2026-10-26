import React, { useState, useRef } from 'react';
import './App.css'

function App() {
  const [username, setUsername] = useState('');
  const [isRegistered, setIsRegistered] = useState(false);
  const [recipient, setRecipient] = useState('');
  const [message, setMessage] = useState('');
  const [chatLog, setChatLog] = useState([]);
  
  const wsRef = useRef(null);


const handleRegister = (event) => {
  event.preventDefault();
  if (username.trim() === '' || recipient.trim() === '') {
    alert('Please enter a username and recipient.');
    return;to
  }

  const ws = new WebSocket('ws://localhost:8080');
  wsRef.current = ws;

  ws.onopen = () => {
    console.log('Connected to WebSocket server');
    ws.send(JSON.stringify({ type: 'register', username }));
    setIsRegistered(true);
  }

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'message') {
      setChatLog((prevChatLog) => [...prevChatLog, data]);
    }
  }

  ws.onclose = () => {
    console.log('Disconnected from WebSocket server');
    setIsRegistered(false);
  }

}

const handleSendMessage = (event) => {
  event.preventDefault();
  
if (!message.trim() || !wsRef.current) return;

    const msgPayload = {
      type: "message",
      sender: username,
      receiver: recipient,
      content: message
    };

    wsRef.current.send(JSON.stringify(msgPayload));
    setMessage('');

}
if (!isRegistered) {
    return (
      <div style={{ padding: "40px", fontFamily: "sans-serif" }}>
        <h2>Welcome to Real-Time Chat</h2>
        <form onSubmit={handleRegister}>
          {/* Input fields for username and recipient */}
          <button type="submit">Start Chatting</button>
        </form>
      </div>
    );
  }


if (!isRegistered) {
    return (
      <div style={{ padding: "40px", fontFamily: "sans-serif" }}>
        <h2>Welcome to Real-Time Chat</h2>
        <form onSubmit={handleRegister}>
          <div style={{ marginBottom: "15px" }}>
            <label>Your Name: </label><br />
            <input 
              type="text" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              placeholder="e.g. Alice"
              required 
            />
          </div>
          <div style={{ marginBottom: "15px" }}>
            <label>Who do you want to chat with?: </label><br />
            <input 
              type="text" 
              value={recipient} 
              onChange={(e) => setRecipient(e.target.value)} 
              placeholder="e.g. Bob"
              required 
            />
          </div>
          <button type="submit">Start Chatting</button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ padding: "30px", fontFamily: "sans-serif", maxWidth: "600px", margin: "auto" }}>
      <h3>Chatting as: <strong>{username}</strong> | Messaging: <strong>{recipient}</strong></h3>
      
      <div style={{ 
        border: "1px solid #ccc", 
        height: "300px", 
        overflowY: "scroll", 
        padding: "15px", 
        marginBottom: "15px",
        background: "#f9f9f9",
        borderRadius: "5px"
      }}>
        {chatLog.map((msg, index) => (
          <div key={index} style={{ marginBottom: "10px", textAlign: msg.sender === username ? "right" : "left" }}>
            <span style={{ 
              display: "inline-block", 
              padding: "8px 12px", 
              borderRadius: "10px", 
              background: msg.sender === username ? "#dcf8c6" : "#fff",
              border: "1px solid #ddd"
            }}>
              <strong>{msg.sender}: </strong> {msg.content}
            </span>
          </div>
        ))}
      </div>

      <form onSubmit={handleSendMessage} style={{ display: "flex", gap: "10px" }}>
        <input 
          type="text" 
          value={message} 
          onChange={(e) => setMessage(e.target.value)} 
          placeholder="Type a message..." 
          style={{ flex: 1, padding: "10px" }}
        />
        <button type="submit" style={{ padding: "10px 20px" }}>Send</button>
      </form>
    </div>
  );
}
export default App;
