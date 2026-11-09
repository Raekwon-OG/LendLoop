import Image from "next/image";

interface LogoProps {
  className?: string;
  size?: number;
}

/**
 * Reusable LendLoop brand logo component.
 * Replaces text or letter badges with the official LendLoop brand logo.
 */
export function Logo({ className = "", size = 32 }: LogoProps) {
  return (
    <Image
      src="/lendloop-logo.png"
      alt="LendLoop Logo"
      width={size}
      height={size}
      priority
      className={`rounded-lg object-contain ${className}`}
    />
  );
}

