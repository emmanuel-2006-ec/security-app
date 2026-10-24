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
  
  // Login State
  const [currentUser, setCurrentUser] = useState<{name: string, address: string} | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [addressInput, setAddressInput] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem("securityUser");
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLogin = async () => {
    if (!nameInput || !addressInput) {
      alert("Please enter both your name and address.");
      return;
    }
    setIsLoggingIn(true);
    
    await supabase.from("users").insert([
      { name: nameInput, address: addressInput }
    ]);

    const user = { name: nameInput, address: addressInput };
    localStorage.setItem("securityUser", JSON.stringify(user));
    setCurrentUser(user);
    setIsLoggingIn(false);
  };

  const unlockAudio = () => {
    const audio = new Audio("/sounds/thieve.mp3");
    audio.play().then(() => {
      audio.pause();
      setIsAudioReady(true);
      setStatus("System Armed & Listening");
    }).catch((err) => {
      alert("Make sure your sound file 'thieve.mp3' is in the public/sounds folder.");
    });
  };

  // The Deep Bass Voice Function
  const speakVoiceAlert = (alertType: string, senderName: string) => {
    if (!("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel(); // Stop any previous voice

    let text = "";
    if (alertType === "thieve") {
      text = `Come! Come! Here at ${senderName}'s house there are thieves!!!! Thieves thieves thiiiiiiiiiieves!`;
    } else if (alertType === "beast") {
      text = `Emergency! A dangerous beast is attacking at ${senderName}'s house! Please come immediately!`;
    } else if (alertType === "fire") {
      text = `Fire! Fire! There is a fire at ${senderName}'s house! Bring water! Fire!`;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Force a deep male voice if available
    const voices = window.speechSynthesis.getVoices();
    const maleVoice = voices.find(v => v.name.includes("Male") || v.name.includes("David") || v.name.includes("Google UK English Male"));
    if (maleVoice) utterance.voice = maleVoice;
    
    // Voice Settings for "Deep Bass Wailing"
    utterance.pitch = 0.1; // Lowest pitch (0 is min, 2 is max)
    utterance.rate = 0.85; // Slower speaking for dramatic wailing effect
    utterance.volume = 1; // Max volume

    window.speechSynthesis.speak(utterance);
  };

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
          
          // Play the MP3 siren
          let soundFile = "/sounds/thieve.mp3"; 
          if (alertType === "beast") soundFile = "/sounds/beast.mp3";
          if (alertType === "fire") soundFile = "/sounds/fire.mp3";

          const siren = new Audio(soundFile);
          siren.play().catch(e => console.error("Play failed:", e));

          // DELAY THE VOICE by 2.5 seconds
          // This lets the siren ring loud and clear before the voice cuts in
          setTimeout(() => {
             speakVoiceAlert(alertType, senderName);
          }, 2500);
          
          setStatus(`🚨 ALERT: ${alertType.toUpperCase()} 🚨`);
          
          // Reset status after 12 seconds (enough time for the voice to finish)
          setTimeout(() => setStatus("System Armed & Listening"), 12000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAudioReady, currentUser]);

  const sendAlert = async (type: string) => {
    if (!isAudioReady || !currentUser) {
      alert("Please wait for the system to arm!");
      return;
    }
    await supabase.from("alerts").insert([
      { alert_type: type, sender_name: currentUser.name },
    ]);
  };

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
            style={{ padding: "15px", borderRadius: "10px", border: "none", fontSize: "16px", color: "black" }}
          />
          <input 
            type="text" 
            placeholder="Physical Address (e.g., Area 47)" 
            value={addressInput}
            onChange={(e) => setAddressInput(e.target.value)}
            style={{ padding: "15px", borderRadius: "10px", border: "none", fontSize: "16px", color: "black" }}
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
