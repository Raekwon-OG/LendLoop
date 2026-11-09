import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <SignUp
      appearance={{
        elements: {
          formButtonPrimary: "bg-emerald-800 hover:bg-emerald-900 text-white",
          card: "shadow-md border border-stone-200",
        },
      }}
    />
  );
}
