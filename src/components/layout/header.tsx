"use client";

import { useSession } from "next-auth/react";
import { Sun, Moon, Search, Bell } from "lucide-react";
import { useEffect, useState } from "react";

export function DashboardHeader() {
  const { data: session } = useSession();
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggleDark() {
    const html = document.documentElement;
    if (html.classList.contains("dark")) {
      html.classList.remove("dark");
      localStorage.setItem("theme", "light");
      setDark(false);
    } else {
      html.classList.add("dark");
      localStorage.setItem("theme", "dark");
      setDark(true);
    }
  }

  const userName = session?.user?.name ?? "Atleta";
  const userEmail = session?.user?.email ?? "";
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="h-16 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-6 flex items-center justify-between flex-shrink-0">
      {/* Search */}
      <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-900 rounded-full px-4 py-2 w-72 max-w-full">
        <Search className="h-4 w-4 text-zinc-400 flex-shrink-0" />
        <input
          type="text"
          placeholder="Cerca attività..."
          className="bg-transparent border-none focus:outline-none text-sm text-zinc-700 dark:text-zinc-300 placeholder:text-zinc-400 w-full"
          readOnly
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Dark mode toggle */}
        <button
          onClick={toggleDark}
          className="p-2 rounded-full text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
          title={dark ? "Modalità chiara" : "Modalità scura"}
        >
          {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>

        {/* Notifications */}
        <button className="relative p-2 rounded-full text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors">
          <Bell className="h-5 w-5" />
        </button>

        {/* User */}
        <div className="flex items-center gap-3 pl-3 ml-1 border-l border-zinc-200 dark:border-zinc-800">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 leading-none">
              {userName}
            </p>
            <p className="text-xs text-zinc-400 mt-0.5">{userEmail}</p>
          </div>
          <div
            className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
            title={userName}
          >
            {initials}
          </div>
        </div>
      </div>
    </header>
  );
}
