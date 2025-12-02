"use client";
import Link from "next/link";
import { BalanceDisplay } from "./balance-display";
import { ModeToggle } from "./mode-toggle";
import UserMenu from "./user-menu";

export default function Header() {
  const links = [
    { to: "/", label: "Home" },
    { to: "/dashboard", label: "Dashboard" },
    { to: "/bets", label: "My Bets" },
    { to: "/deposit", label: "Deposit" },
  ] as const;

  return (
    <div>
      <div className="flex flex-row items-center justify-between px-2 py-1">
        <nav className="flex gap-4 text-lg">
          {links.map(({ to, label }) => (
            <Link href={to} key={to}>
              {label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <BalanceDisplay />
          <ModeToggle />
          <UserMenu />
        </div>
      </div>
      <hr />
    </div>
  );
}
