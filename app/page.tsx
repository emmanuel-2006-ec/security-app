"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function Home() {
  const [isAudioReady, setIsAudioReady] = useState(false);
  const [status, setStatus] = useState("Waiting for alerts...");

  // 1. Unlock Audio (Required by browsers to allow sound)
  const unlockAudio = () => {
    const audio = new Audio("/sounds/thieve.mp3");
    audio.play().then(() => {
      audio.pause();
      setIsAudioReady(true);
      setStatus("System Armed & Listening");
    }).catch(() => {
      alert("Please allow audio playback in your browser settings.");
    });
  };

  // 2. Listen for real-time alerts from Supabase
  useEffect(() => {
    if (!isAudioReady) return;

    const channel = supabase
      .channel("custom-all-channel")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "alerts" },
        (payload) => {
          console.log("New Alert Received!", payload);
          const alertType = payload.new.alert_type;
          playAlertSound(alertType);
          
          // Update status text on screen
          setStatus(`🚨 ALERT RECEIVED: ${alertType.toUpperCase()} 🚨`);
          
          // Reset status after 5 seconds
          setTimeout(() => setStatus("System Armed & Listening"), 5000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAudioReady]);

  // 3. Play the correct sound
  const playAlertSound = (type: string) => {
    let soundFile = "/sounds/thieve.mp3"; // Default
    if (type === "beast") soundFile = "/sounds/beast.mp3";
    if (type === "fire") soundFile = "/sounds/fire.mp3";

    const audio = new Audio(soundFile);
    audio.play().catch((e) => console.error("Audio play failed:", e));
  };

  // 4. Send an alert
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
    <main className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      
      {/* BACKGROUND VIDEO */}
      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute top-0 left-0 w-full h-full object-cover -z-10 opacity-40"
      >
        <source src="/videos/background.mp4" type="video/mp4" />
      </video>

      {/* DARK OVERLAY (Makes text readable) */}
      <div className="absolute inset-0 bg-black/60 -z-10"></div>

      {/* APP CONTENT */}
      <div className="z-10 flex flex-col items-center text-center p-6 w-full max-w-4xl">
        <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-2 tracking-tight">
          Business Security
        </h1>
        
        <div className="bg-black/50 px-4 py-2 rounded-full mb-10 border border-gray-600">
          <p className={`font-semibold ${status.includes("ALERT") ? "text-red-500 animate-pulse" : "text-green-400"}`}>
            {status}
          </p>
        </div>

        {/* AUDIO UNLOCK BUTTON */}
        {!isAudioReady ? (
          <button
            onClick={unlockAudio}
            className="bg-yellow-500 hover:bg-yellow-400 text-black px-8 py-4 rounded-xl font-bold text-xl mb-10 shadow-[0_0_20px_rgba(234,179,8,0.5)] transition transform hover:scale-105"
          >
            🛡️ Tap to Enable Alerts & Sounds
          </button>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mt-4">
            
            {/* ALERT BUTTONS */}
            <button
              onClick={() => sendAlert("thieve")}
              className="bg-red-600 hover:bg-red-500 p-8 rounded-2xl text-3xl font-bold text-white shadow-[0_0_30px_rgba(220,38,38,0.6)] transition transform active:scale-95"
            >
              🚨<br />THIEVE
            </button>
            
            <button
              onClick={() => sendAlert("beast")}
              className="bg-orange-600 hover:bg-orange-500 p-8 rounded-2xl text-3xl font-bold text-white shadow-[0_0_30px_rgba(234,88,12,0.6)] transition transform active:scale-95"
            >
              🐾<br />BEAST
            </button>

            <button
              onClick={() => sendAlert("fire")}
              className="bg-yellow-600 hover:bg-yellow-500 p-8 rounded-2xl text-3xl font-bold text-white shadow-[0_0_30px_rgba(202,138,4,0.6)] transition transform active:scale-95"
            >
              🔥<br />FIRE
            </button>

          </div>
        )}
      </div>
    </main>
  );
}
