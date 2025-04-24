"use client";
import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Link,
  SelectChangeEvent,
} from "@mui/material";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import { useMongoDB, type User } from "@/hooks/useMongoDB";

type LoginProps = {
  user: User | null;
  saveUser: (user: User) => void;
  clearUser: () => void;
};

export default function Login({ user, saveUser, clearUser }: LoginProps) {
  const [isMounted, setIsMounted] = useState(false);
  const {
    createUser,
    getUserByUsername,
    loading,
    error,
    success,
    setError,
    setSuccess,
  } = useMongoDB();

  const [mode, setMode] = useState<"login" | "create">("login");
  const [formData, setFormData] = useState<Omit<User, "_id">>({
    user_name: "",
    birth_year: new Date().getFullYear(),
    gender: "other",
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleTextChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "user_name" ? value.toLowerCase().trim() : value,
    }));
    setError("");
    setSuccess(false);
  };

  const handleSelectChange = (e: SelectChangeEvent) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError("");
    setSuccess(false);
  };

  const handleSubmit = async () => {
    setError("");
    setSuccess(false);

    if (mode === "create") {
      const newUser = await createUser(formData);
      if (newUser) saveUser(newUser);
    } else {
      const existingUser = await getUserByUsername(formData.user_name);
      if (existingUser) saveUser(existingUser);
    }
  };

  if (!isMounted) {
    return null; // Return nothing during SSR
  }

  if (user) {
    return (
      <Box
        sx={{
          maxWidth: 400,
          mx: "auto",
          my: 6,
          p: 4,
          borderRadius: 2,
          bgcolor: "#fff",
          boxShadow: 2,
        }}
      >
        <Typography variant="h6" gutterBottom>
          Welcome, <strong>{user.user_name}</strong>!
        </Typography>
        <Typography variant="body2">
          <strong>Birth Year:</strong> {user.birth_year}
        </Typography>
        <Typography variant="body2">
          <strong>Gender:</strong> {user.gender}
        </Typography>
        <Button onClick={clearUser} variant="text" color="error" sx={{ mt: 2 }}>
          Clear User Data
        </Button>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: 2,
      }}
    >
      <Box
        sx={{
          width: "100%",
          maxWidth: 360,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <FavoriteBorderIcon sx={{ fontSize: 40, mb: 1 }} />
        <Typography variant="h5" fontWeight="bold" gutterBottom>
          Rhythmi
        </Typography>
        <Typography variant="body1" color="textSecondary" gutterBottom>
          {mode === "login" ? "Log in to your account" : "Create a new account"}
        </Typography>

        <Paper
          elevation={1}
          sx={{ width: "100%", mt: 2, px: 3, py: 4, borderRadius: 2 }}
        >
          <TextField
            label="ID"
            name="user_name"
            fullWidth
            value={formData.user_name}
            onChange={handleTextChange}
            margin="normal"
          />

          {mode === "create" && (
            <>
              <TextField
                label="Birth Year"
                name="birth_year"
                type="number"
                fullWidth
                value={formData.birth_year}
                onChange={handleTextChange}
                margin="normal"
                inputProps={{
                  min: 1900,
                  max: new Date().getFullYear(),
                }}
              />
              <FormControl fullWidth margin="normal">
                <InputLabel>Gender</InputLabel>
                <Select
                  name="gender"
                  value={formData.gender}
                  onChange={handleSelectChange}
                  label="Gender"
                >
                  <MenuItem value="male">Male</MenuItem>
                  <MenuItem value="female">Female</MenuItem>
                  <MenuItem value="other">Other</MenuItem>
                </Select>
              </FormControl>
            </>
          )}

          {error && (
            <Typography color="error" variant="body2" mt={1}>
              {error}
            </Typography>
          )}
          {success && (
            <Typography color="success.main" variant="body2" mt={1}>
              Success!
            </Typography>
          )}

          <Button
            fullWidth
            variant="contained"
            onClick={handleSubmit}
            disabled={loading}
            sx={{
              mt: 2,
              bgcolor: "#000",
              color: "#fff",
              "&:hover": { bgcolor: "#333" },
            }}
          >
            {loading
              ? "Processing..."
              : mode === "create"
              ? "Create Account"
              : "Sign In"}
          </Button>

          <Box textAlign="center" mt={2}>
            <Link
              component="button"
              underline="hover"
              fontSize={14}
              onClick={() => {
                setMode(mode === "create" ? "login" : "create");
                setError("");
                setSuccess(false);
              }}
            >
              {mode === "create"
                ? "Already have an account? Log in"
                : "New user? Create an account"}
            </Link>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}