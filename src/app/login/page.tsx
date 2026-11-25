import { AuthCard } from "@/components/auth/auth-card"

export const instant = false

export default function LoginPage() {
  return <AuthCard mode="login" demo={process.env.NODE_ENV !== "production"} />
}
