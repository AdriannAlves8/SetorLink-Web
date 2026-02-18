import React from "react";
import { AuthProvider } from "./context/AuthContext.jsx";
import AppRouter from "./routes/AppRouter.jsx";

export default function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}
