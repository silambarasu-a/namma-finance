import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";

export default async function HomePage() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  // Redirect to role-specific dashboard
  switch (user.role) {
    case "ADMIN":
      redirect("/admin");
    case "MANAGER":
      redirect("/manager");
    case "AGENT":
      redirect("/agent");
    case "CUSTOMER":
      redirect("/customer");
    default:
      redirect("/login");
  }
}
