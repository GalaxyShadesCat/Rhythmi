"use client";
import { Box, Typography, Paper, Avatar } from "@mui/material";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import PersonIcon from "@mui/icons-material/Person";

export default function Profile() {
  const { user } = useLocalStorage();

  if (!user) {
    return (
      <Box sx={{ p: 3, textAlign: "center" }}>
        <Typography variant="h6">Please log in to view your profile</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 600, mx: "auto" }}>
      <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", mb: 3 }}>
          <Avatar sx={{ width: 80, height: 80, bgcolor: "primary.main", mb: 2 }}>
            <PersonIcon sx={{ fontSize: 40 }} />
          </Avatar>
          <Typography variant="h5" gutterBottom>
            {user.user_name}
          </Typography>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" color="textSecondary">
            Username
          </Typography>
          <Typography variant="body1">{user.user_name}</Typography>
        </Box>
        
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" color="textSecondary">
            Birth Year
          </Typography>
          <Typography variant="body1">{user.birth_year}</Typography>
        </Box>
        
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" color="textSecondary">
            Gender
          </Typography>
          <Typography variant="body1">
            {user.gender.charAt(0).toUpperCase() + user.gender.slice(1)}
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}