"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function Home() {
  const [isAudioReady, setIsAudioReady] = useState(false);
  const [status, setStatus] = useState("Waiting for alerts...");
  const [audioPlayer, setAudioPlayer] = useState<HTMLAudioElement | null>(null);
  
  // Login State
  const [currentUser, setCurrentUser] = useState<{name: string, address: string} | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [addressInput, setAddressInput] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Check if user is already logged in (saved in phone's browser)
  useEffect(() => {
    const savedUser = localStorage.getItem("securityUser");
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    }
    const player = new Audio();
    setAudioPlayer(player);
  }, []);

  // Handle Login
  const handleLogin = async () => {
    if (!nameInput || !addressInput) {
      alert("Please enter both your name and address.");
      return;
    }
    setIsLoggingIn(true);
    
    // Save to Supabase
    const { error } = await supabase.from("users").insert([
      { name: nameInput, address: addressInput }
    ]);

    if (error) {
      console.error(error);
      alert("Error saving to database, but we will log you in locally.");
    }

    // Save locally so they don't have to type it again
    const user = { name: nameInput, address: addressInput };
    localStorage.setItem("securityUser", JSON.stringify(user));
    setCurrentUser(user);
    setIsLoggingIn(false);
  };

  // Unlock Audio
  const unlockAudio = () => {
    if (!audioPlayer) return;
    
    audioPlayer.src = "/sounds/thieve.mp3";
    
    audioPlayer.play()
      .then(() => {
        audioPlayer.pause();
        audioPlayer.currentTime = 0;
        setIsAudioReady(true);
        setStatus("System Armed & Listening");
      })
      .catch((err) => {
        console.error("Unlock failed:", err);
        alert("Make sure your sound file 'thieve.mp3' is in the public/sounds folder.");
      });
  };

  // Text-to-Speech Voice Function
  const speakVoiceAlert = (alertType: string, senderName: string) => {
    if (!("speechSynthesis" in window)) return;

    // Cancel any currently speaking voice
    window.speechSynthesis.cancel();

    let text = "";
    if (alertType === "thieve") {
      text = `Come! Come! Here at ${senderName}'s house there are thieves!!!! Thieves thieves thiiiiiiiiiieves!`;
    } else if (alertType === "beast") {
      text = `Emergency! A dangerous beast is attacking at ${senderName}'s house! Please come immediately!`;
    } else if (alertType === "fire") {
      text = `Fire! Fire! There is a fire at ${senderName}'s house! Bring water! Fire!`;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Try to find a deep male voice
    const voices = window.speechSynthesis.getVoices();
    const maleVoice = voices.find(v => v.name.includes("Male") || v.name.includes("David") || v.name.includes("Google UK English Male"));
    
    if (maleVoice) {
      utterance.voice = maleVoice;
    }
    
    utterance.pitch = 0.5; // Lower pitch for a deep voice
    utterance.rate = 1.1; // Slightly faster for urgency
    utterance.volume = 1; // Max volume

    window.speechSynthesis.speak(utterance);
  };

  // Listen for real-time alerts
  useEffect(() => {
    if (!isAudioReady || !currentUser) return;

    const channel = supabase
      .channel("custom-all-channel")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "alerts" },
        (payload) => {
          const alertType = payload.new.alert_type;
          const senderName = payload.new.sender_name;
          
          // Play Sound File
          let soundFile = "/sounds/thieve.mp3"; 
          if (alertType === "beast") soundFile = "/sounds/beast.mp3";
          if (alertType === "fire") soundFile = "/sounds/fire.mp3";

          if (audioPlayer) {
            audioPlayer.src = soundFile;
            audioPlayer.play().catch(e => console.error("Play failed:", e));
          }

          // Play AI Voice
          speakVoiceAlert(alertType, senderName);
          
          setStatus(`🚨 ALERT: ${alertType.toUpperCase()} 🚨`);
          setTimeout(() => setStatus("System Armed & Listening"), 10000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAudioReady, audioPlayer, currentUser]);

  // Send an alert
  const sendAlert = async (type: string) => {
    if (!isAudioReady || !currentUser) {
      alert("Please wait for the system to arm!");
      return;
    }
    
    await supabase.from("alerts").insert([
      { alert_type: type, sender_name: currentUser.name },
    ]);
  };

  // Render Login Screen if not logged in
  if (!currentUser) {
    return (
      <main className="app-container" style={{ justifyContent: "flex-start", paddingTop: "100px" }}>
        <h1 className="title" style={{ marginBottom: "40px" }}>Create Account</h1>
        <div style={{ width: "100%", maxWidth: "400px", display: "flex", flexDirection: "column", gap: "15px" }}>
          <input 
            type="text" 
            placeholder="Your Name (e.g., John)" 
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            style={{ padding: "15px", borderRadius: "10px", border: "none", fontSize: "16px" }}
          />
          <input 
            type="text" 
            placeholder="Physical Address (e.g., Area 47, Sector 3)" 
            value={addressInput}
            onChange={(e) => setAddressInput(e.target.value)}
            style={{ padding: "15px", borderRadius: "10px", border: "none", fontSize: "16px" }}
          />
          <button 
            onClick={handleLogin} 
            disabled={isLoggingIn}
            className="enable-btn" 
            style={{ marginTop: "10px" }}
          >
            {isLoggingIn ? "Saving..." : "Save & Continue"}
          </button>
        </div>
      </main>
    );
  }

  // Render Main App if logged in
  return (
    <main className="app-container">
      <video autoPlay muted loop playsInline className="bg-video">
        <source src="/videos/background.mp4" type="video/mp4" />
      </video>
      
      <div className="overlay"></div>

      <h1 className="title">Welcome, {currentUser.name}</h1>
      <p style={{ color: "#9ca3af", marginBottom: "20px" }}>{currentUser.address}</p>
      
      <div className="status-pill">
        <p className={status.includes("ALERT") ? "status-alert" : "status-ready"}>
          {status}
        </p>
      </div>

      {!isAudioReady ? (
        <button onClick={unlockAudio} className="enable-btn">
          🛡️ Tap to Enable Alerts
        </button>
      ) : (
        <div className="alert-grid">
          <button onClick={() => sendAlert("thieve")} className="alert-btn btn-thieve">
            🚨 THIEVE
          </button>
          <button onClick={() => sendAlert("beast")} className="alert-btn btn-beast">
            🐾 BEAST
          </button>
          <button onClick={() => sendAlert("fire")} className="alert-btn btn-fire">
            🔥 FIRE
          </button>
        </div>
      )}
    </main>
  );
}
