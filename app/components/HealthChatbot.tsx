"use client";
import React, { useEffect, useMemo, useState } from "react";
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
  Slide,
  Fab,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ChatIcon from "@mui/icons-material/Chat";
import { marked } from "marked";
import { RecordData, User } from "@/types/types";
import { HOVER_BLUE, PRIMARY_BLUE } from "@/utils/constants";

// Define health metrics guidelines
const metricGuidelines = `
| Metric | Normal Range | Abnormal Values | Potential Issues |
|--------|---------------|------------------|------------------|
| Average Heart Rate | 60–100 bpm | <60, >100 | Bradycardia, Tachycardia |
| Heart Rate Variability | 50–100 ms | <30 ms | High stress, cardiovascular risk |
| Heart Rate Recovery | >18 bpm | <12 bpm | Poor fitness |
`;

const CHAT_MESSAGES_KEY = "chat_messages"; // Local storage key

type HealthChatbotProps = {
  user: User; // User data
  openChat: boolean; // Chat toggle state
  setOpenChat: React.Dispatch<React.SetStateAction<boolean>>;
  chatRecord: RecordData | null; // Current record data
  records: RecordData[]; // Recent records data
};

// Main function
function HealthChatbot({
  user,
  openChat,
  setOpenChat,
  chatRecord,
  records,
}: HealthChatbotProps) {
  const [input, setInput] = useState(""); // User input
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false); // Loading status

  // Reformat record for display
  function formatRecord(record: RecordData) {
    return `
  Date: ${record.datetime}
  Rest: HR: ${record.rest_metrics.avgHeartRate}, HRV: ${
      record.rest_metrics.heartRateVariability
    }, Duration: ${(record.rest_metrics.duration / 60000).toFixed(1)}mins
  Exercise: HR: ${record.exercise_metrics.avgHeartRate}, HRV: ${
      record.exercise_metrics.heartRateVariability
    }, Duration: ${(record.exercise_metrics.duration / 60000).toFixed(1)}mins
  Recovery: HR: ${record.recovery_metrics.avgHeartRate}, HRV: ${
      record.recovery_metrics.heartRateVariability
    }, Duration: ${(record.recovery_metrics.duration / 60000).toFixed(1)}mins
  Heart Rate Recovery: ${
    record.hrr_points
      ?.map(
        (point) =>
          `\n    Time after exercise: ${point.time}s, HR: ${point.hr}, HRR: ${point.hrr}`
      )
      .join(",") || "N/A"
  }
  `;
  }

  // Memoized string for recent records
  const recentRecordsString = useMemo(() => {
    return records.slice(-5).map(formatRecord).join("\n");
  }, [records]);

  // Memoized string for current records
  const selectedRecordString = useMemo(() => {
    if (chatRecord) {
      return formatRecord(chatRecord);
    } else {
      return "No record selected.";
    }
  }, [chatRecord]);

  const age = new Date().getFullYear() - user.birth_year;
  // System prompt
  const SYSTEM_PROMPT = useMemo(
    () => ({
      role: "system",
      content: `You are a helpful health assistant. The user will ask about their cardiovascular and ECG data. Keep your responses short, simple and easy to understand. Reference the following medical metric guidelines:\n\n${metricGuidelines}\n\nUser Info:\nUsername: ${user.user_name}\nGender: ${user.gender}\nBirth Year: ${user.birth_year}\nAge: ${age}\n\nRecent Records:\n${recentRecordsString}\n\nSelected Record for Discussion (but user may be asking about recent records):\n${selectedRecordString}\n\nThese records were collected when a user wore a Polar H10 heart rate sensor where they were at rest, exercise/walk for 5 to 6 minutes and then recovered while monitoring their heart rate recovery. If the durations are too short, the data may not be accurate. The user may ask about their heart rate, heart rate variability, and other metrics. You can also provide general health tips based on the user's data. If the user asks about a specific metric, provide a brief explanation and its normal range. If the user asks about their health, provide general advice based on their data. If the user asks about a specific record, provide details about that record. If the user asks about a specific metric, provide details about that metric.`,
    }),
    [user, recentRecordsString, selectedRecordString]
  );

  console.log("System prompt:", SYSTEM_PROMPT.content);

  // Load messages on mount
  useEffect(() => {
    const cached = localStorage.getItem(CHAT_MESSAGES_KEY);
    const parsed = cached ? JSON.parse(cached) : [];
    setMessages(parsed);
    console.log("Loaded messages from localStorage:", parsed);
  }, []);

  // Save messages on update
  useEffect(() => {
    if (messages.length === 0) return; // Don't save if no messages
    localStorage.setItem(CHAT_MESSAGES_KEY, JSON.stringify(messages));
  }, [messages]);

  // Scroll to bottom when messages change
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Send message to chatbot
  const sendMessage = async () => {
    if (!input.trim()) return;

    const updatedMessages = [
      ...messages,
      { role: "user", content: input.trim() },
    ];
    setMessages(updatedMessages);
    setInput(""); // Clear input field
    setLoading(true); // Update loading state

    const OPENROUTER_API_KEY = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY; // Get API key
    if (!OPENROUTER_API_KEY) {
      console.error("Missing OpenRouter API key");
      setLoading(false);
      return;
    }

    try {
      // POST request to OpenRouter API
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
          messages: [SYSTEM_PROMPT, ...updatedMessages.slice(-10)],
        }),
      });

      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content; // Get chatbot reply

      setMessages([
        ...updatedMessages,
        {
          role: "assistant",
          content: reply || "Sorry, I couldn't generate a response.", // Display chatbot reply
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
      setLoading(false); // Reset loading state
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    localStorage.removeItem(CHAT_MESSAGES_KEY);
  };

  return (
    <>
      {/* Floating Chat Button */}
      <Fab
        color="primary"
        onClick={() => {
          setOpenChat((prev) => {
            return !prev;
          });
        }}
        sx={{
          position: "fixed",
          bottom: 80,
          right: 16,
          bgcolor: PRIMARY_BLUE,
          "&:hover": { bgcolor: HOVER_BLUE },
        }}
      >
        <ChatIcon />
      </Fab>

      <Slide direction="up" in={openChat} mountOnEnter>
        <Box
          sx={{
            position: "fixed",
            zIndex: 1300,
            bgcolor: "#fff",
            display: "flex",
            flexDirection: "column",
            boxShadow: 6,
            borderRadius: { xs: 0, sm: 2 },
            overflow: "hidden",
            top: { xs: 0, sm: "auto" },
            left: { xs: 0, sm: "auto" },
            right: { xs: 0, sm: 24 },
            bottom: { xs: 0, sm: 150 },
            width: { xs: "100%", sm: 400 },
            height: { xs: "100%", sm: 550 },
          }}
        >
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
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  {/* ---- Clear Chat Button ---- */}
                  <Button
                    variant="outlined"
                    color="secondary"
                    size="small"
                    onClick={handleClearChat}
                    sx={{
                      borderColor: "#bbb",
                      color: "#333",
                      textTransform: "none",
                      px: 1.5,
                      py: 0.5,
                      fontSize: "0.85rem",
                      "&:hover": {
                        bgcolor: "#f5f5f5",
                        borderColor: "#888",
                      },
                    }}
                  >
                    New Chat
                  </Button>
                  {/* ---- Close Icon ---- */}
                  <IconButton
                    edge="end"
                    onClick={() => {
                      setOpenChat(false);
                    }}
                  >
                    <CloseIcon />
                  </IconButton>
                </Box>
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
                        dangerouslySetInnerHTML={{
                          __html: marked(msg.content),
                        }}
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
        </Box>
      </Slide>
    </>
  );
}

export default HealthChatbot;
