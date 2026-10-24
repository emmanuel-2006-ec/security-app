"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function Home() {
  const [isAudioReady, setIsAudioReady] = useState(false);
  const [status, setStatus] = useState("Waiting for alerts...");
  
  const [currentUser, setCurrentUser] = useState<{name: string, address: string} | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [addressInput, setAddressInput] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [isAIListening, setIsAIListening] = useState(false);
  const recognizerRef = useRef<any>(null);

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

  const toggleAIListening = async () => {
    if (isAIListening) {
      if (recognizerRef.current) {
        recognizerRef.current.stopListening();
      }
      setIsAIListening(false);
      setStatus("AI Listening Stopped");
      return;
    }

    try {
      setStatus("Requesting Microphone...");
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());

      setStatus("Loading AI Engine...");
      
      const tf = await import("@tensorflow/tfjs");
      await tf.ready(); 
      
      setStatus("Loading AI Model...");
      
      const speechCommands = await import("@tensorflow-models/speech-commands");
      const recognizer = speechCommands.create("BROWSER_FFT");
      await recognizer.ensureModelLoaded();
      recognizerRef.current = recognizer;

      setStatus("AI is listening for danger...");
      setIsAIListening(true);

      recognizer.listen(
        async (result: any) => {
          const scores = await result.scores;
          const maxScore = Math.max(...scores);
          const maxIndex = scores.indexOf(maxScore);
          const detectedWord = recognizer.wordLabels()[maxIndex];

          // FIXED: Set to 0.80 and removed "_unknown_" so silence doesn't trigger it
          if (maxScore > 0.80 && (detectedWord === "noise" || detectedWord === "speech")) {
             if (status !== "🚨 AI DETECTED DANGER 🚨") {
                setStatus("🚨 AI DETECTED DANGER 🚨");
                
                await supabase.from("alerts").insert([
                  { alert_type: "thieve", sender_name: `${currentUser?.name} (AI Auto-Detect)` },
                ]);

                setTimeout(() => {
                    if (isAIListening) setStatus("AI is listening for danger...");
                }, 10000);
             }
          }
        },
        {
          includeSpectrogram: true,
          probabilityThreshold: 0.80, // Fixed threshold
          invokeCallbackOnNoiseAndUnknown: true,
          overlapFactor: 0.50
        }
      );
    } catch (error: any) {
      console.error(error);
      alert("AI failed: " + (error.message || error));
      setIsAIListening(false);
      setStatus("AI Error");
    }
  };

  const speakVoiceAlert = (alertType: string, senderName: string) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel(); 

    let text = "";
    if (alertType === "thieve") text = `Come! Come! Here at ${senderName}'s house there are thieves!!!!`;
    else if (alertType === "beast") text = `Emergency! A dangerous beast is attacking at ${senderName}'s house!`;
    else if (alertType === "fire") text = `Fire! Fire! There is a fire at ${senderName}'s house!`;

    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const maleVoice = voices.find(v => v.name.includes("Male") || v.name.includes("David"));
    if (maleVoice) utterance.voice = maleVoice;
    
    utterance.pitch = 0.1; 
    utterance.rate = 0.85; 
    utterance.volume = 1; 

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
          
          let soundFile = "/sounds/thieve.mp3"; 
          if (alertType === "beast") soundFile = "/sounds/beast.mp3";
          if (alertType === "fire") soundFile = "/sounds/fire.mp3";

          const siren = new Audio(soundFile);
          siren.play().catch(e => console.error("Play failed:", e));

          setTimeout(() => {
             speakVoiceAlert(alertType, senderName);
          }, 2500);
          
          setStatus(`🚨 ALERT: ${alertType.toUpperCase()} 🚨`);
          setTimeout(() => setStatus("System Armed & Listening"), 12000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAudioReady, currentUser]);

  const sendAlert = async (type: string) => {
    if (!isAudioReady || !currentUser) return;
    await supabase.from("alerts").insert([
      { alert_type: type, sender_name: currentUser.name },
    ]);
  };

  if (!currentUser) {
    return (
      <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", paddingTop: "100px", paddingLeft: "20px", paddingRight: "20px", overflowY: "auto" }}>
        <h1 style={{ fontSize: "2.5rem", fontWeight: "800", marginBottom: "40px", textAlign: "center" }}>Create Account</h1>
        <div style={{ width: "100%", maxWidth: "400px", display: "flex", flexDirection: "column", gap: "15px" }}>
          <input type="text" placeholder="Your Name" value={nameInput} onChange={(e) => setNameInput(e.target.value)} style={{ padding: "15px", borderRadius: "10px", border: "none", fontSize: "16px", color: "black" }} />
          <input type="text" placeholder="Physical Address" value={addressInput} onChange={(e) => setAddressInput(e.target.value)} style={{ padding: "15px", borderRadius: "10px", border: "none", fontSize: "16px", color: "black" }} />
          <button onClick={handleLogin} disabled={isLoggingIn} className="enable-btn" style={{ marginTop: "10px" }}>
            {isLoggingIn ? "Saving..." : "Save & Continue"}
          </button>
        </div>
      </main>
    );
  }

  return (
    <main style={{ position: "relative", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", padding: "60px 20px 120px 20px", overflowY: "auto", width: "100%" }}>
      <video autoPlay muted loop playsInline style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", objectFit: "cover", zIndex: -2, opacity: 0.3 }}>
        <source src="/videos/background.mp4" type="video/mp4" />
      </video>
      
      <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", backgroundColor: "rgba(17, 24, 39, 0.7)", zIndex: -1 }}></div>

      <h1 style={{ fontSize: "2.5rem", fontWeight: "800", marginBottom: "10px", textAlign: "center" }}>Welcome, {currentUser.name}</h1>
      <p style={{ color: "#9ca3af", marginBottom: "20px" }}>{currentUser.address}</p>
      
      <div style={{ backgroundColor: "rgba(0, 0, 0, 0.6)", padding: "10px 20px", borderRadius: "50px", border: "1px solid #374151", marginBottom: "40px", fontWeight: "600" }}>
        <p style={{ color: (status.includes("ALERT") || status.includes("DANGER")) ? "#ef4444" : "#4ade80" }}>
          {status}
        </p>
      </div>

      {!isAudioReady ? (
        <button onClick={unlockAudio} className="enable-btn">
          🛡️ Tap to Enable Alerts
        </button>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px", width: "100%", maxWidth: "400px" }}>
          <div className="alert-grid">
            <button onClick={() => sendAlert("thieve")} className="alert-btn btn-thieve">🚨 THIEVE</button>
            <button onClick={() => sendAlert("beast")} className="alert-btn btn-beast">🐾 BEAST</button>
            <button onClick={() => sendAlert("fire")} className="alert-btn btn-fire">🔥 FIRE</button>
          </div>
          
          <button 
            onClick={toggleAIListening} 
            style={{ marginTop: "20px", marginBottom: "30px", padding: "15px", borderRadius: "10px", backgroundColor: isAIListening ? "#ef4444" : "#3b82f6", color: "white", fontWeight: "bold", border: "none", cursor: "pointer", fontSize: "16px" }}
          >
            {isAIListening ? "🔴 STOP AI LISTENING" : "🤖 Turn On AI Sound Detection"}
          </button>
          
          <p style={{ fontSize: "12px", color: "#9ca3af", textAlign: "center", marginBottom: "60px" }}>
            Note: AI listening only works while the app is open on the screen.
          </p>
        </div>
      )}
    </main>
  );
}
