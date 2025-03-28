import React, { useState } from "react";
import { useMongoDB, type User } from "@/hooks/useMongoDB";

type UserPanelProps = {
  user: User | null;
  saveUser: (user: User) => void;
  clearUser: () => void;
};

export default function UserPanel({
  user,
  saveUser,
  clearUser,
}: UserPanelProps) {
  const {
    createUser,
    getUserByUsername,
    loading,
    error,
    success,
    setError,
    setSuccess,
  } = useMongoDB();

  const [formData, setFormData] = useState<Omit<User, "_id">>({
    user_name: "",
    birth_year: new Date().getFullYear(),
    gender: "other",
  });

  const [mode, setMode] = useState<"create" | "login">("create");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "user_name" ? value.toLowerCase().trim() : value,
    }));

    // Clear messages while typing
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

  return (
    <div className="max-w-md mx-auto my-10 p-6 border rounded-md shadow-sm bg-white space-y-4">
      {user ? (
        <div>
          <h2 className="text-xl font-bold mb-2">Welcome, {user.user_name}!</h2>
          <p>
            <strong>Birth Year:</strong> {user.birth_year}
          </p>
          <p>
            <strong>Gender:</strong> {user.gender}
          </p>
          <button
            onClick={clearUser}
            className="mt-4 text-sm text-red-600 underline"
          >
            Clear User Data
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">
            {mode === "create" ? "Create a New User" : "Login with Username"}
          </h2>

          <div>
            <label className="block text-sm font-medium">Username</label>
            <input
              name="user_name"
              value={formData.user_name}
              onChange={handleChange}
              className="w-full mt-1 p-2 border rounded"
              required
            />
          </div>

          {mode === "create" && (
            <>
              <div>
                <label className="block text-sm font-medium">Birth Year</label>
                <input
                  name="birth_year"
                  type="number"
                  value={formData.birth_year}
                  onChange={handleChange}
                  className="w-full mt-1 p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Gender</label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="w-full mt-1 p-2 border rounded"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </>
          )}

          {error && <p className="text-red-600 text-sm">{error}</p>}
          {success && <p className="text-green-600 text-sm">Success!</p>}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
          >
            {loading
              ? "Processing..."
              : mode === "create"
              ? "Create User"
              : "Login"}
          </button>

          <div className="text-sm text-center mt-2">
            {mode === "create" ? (
              <button
                onClick={() => {
                  setMode("login");
                  setError("");
                  setSuccess(false);
                }}
                className="text-blue-600 underline"
              >
                Already have an account? Log in
              </button>
            ) : (
              <button
                onClick={() => {
                  setMode("create");
                  setError("");
                  setSuccess(false);
                }}
                className="text-blue-600 underline"
              >
                New user? Create an account
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
