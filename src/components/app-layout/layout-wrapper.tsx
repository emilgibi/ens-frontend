"use client"

import type React from "react"

import { useState, createContext, useContext } from "react"
import { Sidebar } from "./sidebar"

const SidebarContext = createContext<{
  isCollapsed: boolean
  setIsCollapsed: (collapsed: boolean) => void
}>({
  isCollapsed: false,
  setIsCollapsed: () => {},
})

export const useSidebarContext = () => useContext(SidebarContext)

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  return (
    <SidebarContext.Provider value={{ isCollapsed, setIsCollapsed }}>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className={`flex-1 transition-all duration-200 ${isCollapsed ? "lg:ml-[72px]" : "lg:ml-72"}`}>
          <div className="p-6 lg:p-8 ml-16 lg:ml-0">{children}</div>
        </main>
      </div>
    </SidebarContext.Provider>
  )
}
