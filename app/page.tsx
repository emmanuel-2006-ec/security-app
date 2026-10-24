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

  useEffect(() => {
    const player = new Audio();
    setAudioPlayer(player);
  }, []);

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

  useEffect(() => {
    if (!isAudioReady) return;

    const channel = supabase
      .channel("custom-all-channel")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "alerts" },
        (payload) => {
          const alertType = payload.new.alert_type;
          
          let soundFile = "/sounds/thieve.mp3"; 
          if (alertType === "beast") soundFile = "/sounds/beast.mp3";
          if (alertType === "fire") soundFile = "/sounds/fire.mp3";

          if (audioPlayer) {
            audioPlayer.src = soundFile;
            audioPlayer.play().catch(e => console.error("Play failed:", e));
          }
          
          setStatus(`🚨 ALERT: ${alertType.toUpperCase()} 🚨`);
          setTimeout(() => setStatus("System Armed & Listening"), 5000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAudioReady, audioPlayer]);

  const sendAlert = async (type: string) => {
    if (!isAudioReady) {
      alert("Please click 'Enable Alerts' first!");
      return;
    }
    
    await supabase.from("alerts").insert([
      { alert_type: type, sender_name: "Client Device" },
    ]);
  };

  return (
    <main className="app-container">
      {/* Background Video */}
      <video autoPlay muted loop playsInline className="bg-video">
        <source src="/videos/background.mp4" type="video/mp4" />
      </video>
      
      {/* Dark Overlay */}
      <div className="overlay"></div>

      {/* Header */}
      <h1 className="title">Business Security</h1>
      
      {/* Status */}
      <div className="status-pill">
        <p className={status.includes("ALERT") ? "status-alert" : "status-ready"}>
          {status}
        </p>
      </div>

      {/* Buttons */}
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
