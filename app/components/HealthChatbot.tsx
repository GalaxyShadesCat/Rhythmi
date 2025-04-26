"use client";
import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  CircularProgress,
  AppBar,
  Toolbar,
  IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { marked } from "marked";
import { User } from "@/types/types";

const getRandom = (min: number, max: number) =>
  Math.round((Math.random() * (max - min) + min) * 100) / 100;

const metricGuidelines = `
| Metric | Normal Range | Abnormal Values | Potential Issues |
|--------|---------------|------------------|------------------|
| Average Heart Rate | 60–100 bpm | <60, >100 | Bradycardia, Tachycardia |
| Heart Rate Variability | 50–100 ms | <30 ms | High stress, cardiovascular risk |
| QT Interval | 350–450 ms | >450 ms | Risk of arrhythmias |
| ST Segment Elevation | <0.1 mV | >0.1 mV | Possible heart attack |
| R Peaks | Varies | Irregular spacing | Arrhythmias |
| QRS Complex Duration | 80–120 ms | >120 ms | Ventricular arrhythmias |
| QRS Complex Amplitude | 0.5–2.5 mV | <0.5, >2.5 | Low/high voltage |
| Heart Rate Recovery | >18 bpm | <12 bpm | Poor fitness |
| ST Deviation | <0.05 mV | >0.05 mV | Ischemia |
| HRV Change | Varies | Large negative | Fatigue, stress |
| QT Change | <30 ms | >30 ms | Drug/electrolyte effects |
`;

type HealthChatbotProps = {
  user: User;
  setOpenChat: (open: boolean) => void;
};

function HealthChatbot({ user, setOpenChat }: HealthChatbotProps) {
  const [input, setInput] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const dummyMetrics = React.useMemo(() => {
    return Array.from({ length: 5 }, () => ({
      averageHeartRate: getRandom(60, 100), // bpm
      heartRateVariability: getRandom(50, 100), // ms
      qtInterval: getRandom(370, 440), // ms
      stSegment: {
        elevation: getRandom(0.01, 0.09), // mV
        duration: getRandom(100, 160), // ms
      },
      rPeaks: [1000, 2000, 3000, 4000, 5000],
      qrsComplex: {
        duration: getRandom(80, 120),
        amplitude: getRandom(0.5, 2.0),
      },
      heartRateRecovery: getRandom(18, 25),
      stDeviation: getRandom(0.01, 0.04),
      hrvChange: getRandom(-10, 10),
      qtChange: getRandom(5, 25),
    }));
  }, []);

  const SYSTEM_PROMPT = React.useRef({
    role: "system",
    content: `You are a helpful health assistant. The user will ask about their cardiovascular and ECG data. Keep your responses short and simple. Reference the following medical metric guidelines:\n\n${metricGuidelines}\n\nUser Info:\nUser Name: ${
      user.user_name
    }\nGender: ${user.gender}\nBirth Year: ${
      user.birth_year
    }\n\nRecent ECG Metrics:\n${JSON.stringify(dummyMetrics, null, 2)}`,
  });

  // Load messages on mount
  useEffect(() => {
    const cached = localStorage.getItem("chat_messages");
    const parsed = cached ? JSON.parse(cached) : [];
    setMessages(parsed);
    console.log("Loaded messages from localStorage:", parsed);
  }, []);

  // Save messages on update
  useEffect(() => {
    if (messages.length === 0) return; // Don't save if no messages
    localStorage.setItem("chat_messages", JSON.stringify(messages));
  }, [messages]);

  // Scroll to bottom when messages change
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const updatedMessages = [
      ...messages,
      { role: "user", content: input.trim() },
    ];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    const OPENROUTER_API_KEY = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;
    if (!OPENROUTER_API_KEY) {
      console.error("Missing OpenRouter API key");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ` + OPENROUTER_API_KEY,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://rhythmi.vercel.app/",
          "X-Title": "Rhythmi",
        },
        body: JSON.stringify({
          model: "microsoft/mai-ds-r1:free",
          messages: [SYSTEM_PROMPT.current, ...updatedMessages.slice(-10)],
        }),
      });

      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content;

      setMessages([
        ...updatedMessages,
        {
          role: "assistant",
          content: reply || "Sorry, I couldn't generate a response.",
        },
      ]);
    } catch (err) {
      console.error("Chat error:", err);
      setMessages([
        ...updatedMessages,
        {
          role: "assistant",
          content: "Error contacting the assistant. Please try again later.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      {/* AppBar at top */}
      <AppBar
        position="static"
        sx={{
          bgcolor: "#fff",
          color: "#000",
          boxShadow: 1,
          zIndex: 10,
        }}
      >
        <Toolbar sx={{ justifyContent: "space-between" }}>
          <Typography variant="h6">🩺 Health Chatbot</Typography>
          <IconButton edge="end" onClick={() => setOpenChat(false)}>
            <CloseIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Chat messages list (scrollable) */}
      <Box
        sx={{
          flexGrow: 1,
          overflowY: "auto",
          p: 2,
          bgcolor: "#fff",
        }}
      >
        <Paper
          elevation={0}
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 1,
            p: 2,
            bgcolor: "#fff",
            borderRadius: 2,
            minHeight: "100%",
          }}
        >
          {messages
            .filter((msg) => msg.role !== "system")
            .map((msg, i) => (
              <Box
                key={i}
                sx={{
                  display: "flex",
                  justifyContent:
                    msg.role === "user" ? "flex-end" : "flex-start",
                }}
              >
                <Box
                  sx={{
                    px: 2,
                    py: 1,
                    maxWidth: "90%",
                    bgcolor: msg.role === "user" ? "#f5f5f5" : "#f0ebff",
                    color: "#333",
                    borderRadius: 2,
                    fontSize: "0.9rem",
                    wordBreak: "break-word",
                  }}
                  dangerouslySetInnerHTML={{ __html: marked(msg.content) }}
                />
              </Box>
            ))}
          {loading && (
            <Typography
              variant="body2"
              sx={{ color: "#999", fontStyle: "italic", mt: 1 }}
            >
              <CircularProgress size={14} sx={{ mr: 1 }} /> Typing...
            </Typography>
          )}
          <div ref={messagesEndRef} />
        </Paper>
      </Box>

      {/* Input area at bottom */}
      <Box
        sx={{
          display: "flex",
          gap: 1,
          p: 2,
          borderTop: "1px solid #ddd",
          bgcolor: "#fff",
        }}
      >
        <TextField
          variant="outlined"
          placeholder="Ask about your heart..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          fullWidth
          size="small"
          sx={{
            bgcolor: "#fff",
            borderRadius: 2,
            "& input": { fontSize: "0.9rem" },
          }}
        />
        <Button
          variant="contained"
          onClick={sendMessage}
          disabled={loading}
          sx={{
            bgcolor: "#000",
            color: "#fff",
            textTransform: "none",
            borderRadius: 2,
            px: 2,
            "&:hover": { bgcolor: "#000" },
          }}
        >
          Send
        </Button>
      </Box>
    </Box>
  );
}

export default HealthChatbot;
