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

  // 1. Create a reusable audio element ONCE.
  // This stops the browser from blocking sounds later.
  useEffect(() => {
    const player = new Audio();
    setAudioPlayer(player);
  }, []);

  // 2. Unlock Audio
  const unlockAudio = () => {
    if (!audioPlayer) return;
    
    // Point it to the thieve sound (make sure this file exists!)
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
        alert("Make sure your sound file 'thieve.mp3' is in the public/sounds folder, and check your phone's volume.");
      });
  };

  // 3. Listen for real-time alerts
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
          
          setStatus(`🚨 ALERT RECEIVED: ${alertType.toUpperCase()} 🚨`);
          setTimeout(() => setStatus("System Armed & Listening"), 5000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAudioReady, audioPlayer]);

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
      
      <video autoPlay muted loop playsInline className="absolute top-0 left-0 w-full h-full object-cover -z-10 opacity-40">
        <source src="/videos/background.mp4" type="video/mp4" />
      </video>

      <div className="absolute inset-0 bg-black/60 -z-10"></div>

      <div className="z-10 flex flex-col items-center text-center p-6 w-full max-w-4xl">
        <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-2 tracking-tight">
          Business Security
        </h1>
        
        <div className="bg-black/50 px-4 py-2 rounded-full mb-10 border border-gray-600">
          <p className={`font-semibold ${status.includes("ALERT") ? "text-red-500 animate-pulse" : "text-green-400"}`}>
            {status}
          </p>
        </div>

        {!isAudioReady ? (
          <button onClick={unlockAudio} className="bg-yellow-500 hover:bg-yellow-400 text-black px-8 py-4 rounded-xl font-bold text-xl mb-10 shadow-[0_0_20px_rgba(234,179,8,0.5)] transition transform hover:scale-105">
            🛡️ Tap to Enable Alerts & Sounds
          </button>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mt-4">
            <button onClick={() => sendAlert("thieve")} className="bg-red-600 hover:bg-red-500 p-8 rounded-2xl text-3xl font-bold text-white shadow-[0_0_30px_rgba(220,38,38,0.6)] transition transform active:scale-95">
              🚨<br />THIEVE
            </button>
            <button onClick={() => sendAlert("beast")} className="bg-orange-600 hover:bg-orange-500 p-8 rounded-2xl text-3xl font-bold text-white shadow-[0_0_30px_rgba(234,88,12,0.6)] transition transform active:scale-95">
              🐾<br />BEAST
            </button>
            <button onClick={() => sendAlert("fire")} className="bg-yellow-600 hover:bg-yellow-500 p-8 rounded-2xl text-3xl font-bold text-white shadow-[0_0_30px_rgba(202,138,4,0.6)] transition transform active:scale-95">
              🔥<br />FIRE
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
