"use client";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Divider,
  Chip,
} from "@mui/material";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import PersonIcon from "@mui/icons-material/Person";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import WcIcon from "@mui/icons-material/Wc";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import { useEffect, useState } from "react";
import { BLUE_GRADIENT, LIGHT_BLUE, PRIMARY_BLUE } from "@/utils/constants";

// Blue theme colors

export default function Profile() {
  const { user } = useLocalStorage();
  const [age, setAge] = useState<number | null>(null);

  useEffect(() => {
    if (user?.birth_year) {
      const currentYear = new Date().getFullYear();
      // Fix: Convert to number only if it's a string
      const birthYear =
        typeof user.birth_year === "string"
          ? parseInt(user.birth_year, 10)
          : user.birth_year;
      setAge(currentYear - birthYear);
    }
  }, [user?.birth_year]);

  if (!user) {
    return (
      <Box sx={{ p: 3, textAlign: "center" }}>
        <Typography variant="h6">Please log in to view your profile</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 600, mx: "auto" }}>
      <Card elevation={3} sx={{ borderRadius: 3, overflow: "hidden" }}>
        {/* Header/Banner */}
        <Box
          sx={{
            height: 80,
            bgcolor: PRIMARY_BLUE,
            background: BLUE_GRADIENT,
            position: "relative",
          }}
        />

        <CardContent sx={{ textAlign: "center", pt: 3 }}>
          <Typography variant="h4" sx={{ fontWeight: 600 }}>
            {user.user_name}
          </Typography>

          <Box sx={{ my: 2 }}>
            <Chip
              icon={<FavoriteBorderIcon />}
              label="Rhythmi User"
              sx={{
                fontWeight: 500,
                color: PRIMARY_BLUE,
                borderColor: PRIMARY_BLUE,
                "& .MuiChip-icon": {
                  color: PRIMARY_BLUE,
                },
              }}
              variant="outlined"
            />
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Side-by-side user information */}
          <Box sx={{ display: "flex", justifyContent: "center" }}>
            <Box
              sx={{
                display: "flex",
                flexDirection: { xs: "column", sm: "row" },
                gap: 2,
                width: "100%",
              }}
            >
              {/* Username */}
              <Box
                sx={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  p: 2,
                  borderRadius: 2,
                  backgroundColor: LIGHT_BLUE,
                }}
              >
                <PersonIcon sx={{ fontSize: 28, mb: 1, color: PRIMARY_BLUE }} />
                <Typography variant="body2" color="text.secondary">
                  Username
                </Typography>
                <Typography variant="subtitle1" fontWeight="medium">
                  {user.user_name}
                </Typography>
              </Box>

              {/* Birth Year */}
              <Box
                sx={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  p: 2,
                  borderRadius: 2,
                  backgroundColor: LIGHT_BLUE,
                }}
              >
                <CalendarMonthIcon
                  sx={{ fontSize: 28, mb: 1, color: PRIMARY_BLUE }}
                />
                <Typography variant="body2" color="text.secondary">
                  Birth Year
                </Typography>
                <Typography variant="subtitle1" fontWeight="medium">
                  {user.birth_year} {age && `(${age} y/o)`}
                </Typography>
              </Box>

              {/* Gender */}
              <Box
                sx={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  p: 2,
                  borderRadius: 2,
                  backgroundColor: LIGHT_BLUE,
                }}
              >
                <WcIcon sx={{ fontSize: 28, mb: 1, color: PRIMARY_BLUE }} />
                <Typography variant="body2" color="text.secondary">
                  Gender
                </Typography>
                <Typography variant="subtitle1" fontWeight="medium">
                  {user.gender.charAt(0).toUpperCase() + user.gender.slice(1)}
                </Typography>
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
