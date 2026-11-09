import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <SignIn
      appearance={{
        elements: {
          formButtonPrimary: "bg-emerald-800 hover:bg-emerald-900 text-white",
          card: "shadow-md border border-stone-200",
        },
      }}
    />
  );
}
