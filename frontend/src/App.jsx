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
    return;
  }

  const ws = new WebSocket('ws://localhost:8080/ws');
  wsRef.current = ws;

  ws.onopen = () => {
    console.log('Connected to WebSocket server');
    ws.send(JSON.stringify({ type: 'register', sender: username }));
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
      <div className="app-container">
        <div className="card">
          <h2>Quick chat</h2>
          <form onSubmit={handleRegister}>
            <div className="input-group">
              <label>Your name</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your name"
                required
              />
            </div>
            <div className="input-group">
              <label>Recipient</label>
              <input
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="Enter recipient's name"
                required
              />
            </div>
            <button type="submit" className="btn">Start Chatting</button>  
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="card chat-card">
        <div className="chat-header">
          Connected as: <strong>{username}</strong> → <strong>{recipient}</strong>
        </div>

        <div className="chat-window">
            {chatLog.map((msg, index) => {
            const isOutgoing = msg.sender === username;
            return (
              <div key={index} className={`message-row ${isOutgoing ? 'outgoing' : 'incoming'}`}>
                <div className={`message-bubble ${isOutgoing ? 'outgoing' : 'incoming'}`}>
                  <div className="message-sender">{msg.sender}</div>
                  <div>{msg.content}</div>
                </div>
              </div>
            );
          })}
        </div>

        <form onSubmit={handleSendMessage} className="chat-form">
          <input 
            type="text" 
            value={message} 
            onChange={(e) => setMessage(e.target.value)} 
            placeholder="Type a message..." 
          />
          <button type="submit" className="btn">Send</button>
        </form>
      </div>
    </div>
  );
}
export default App;
