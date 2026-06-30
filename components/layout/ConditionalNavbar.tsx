"use client";

import { usePathname } from "next/navigation";
import Navbar from "@/components/layout/Navbar";

/**
 * 条件导航栏：在 /app 页面隐藏导航栏，避免占用宝贵的垂直空间。
 * /app 页面的左侧面板已有自己的应用名称标题。
 */
export default function ConditionalNavbar() {
  const pathname = usePathname();
  const isAppPage = pathname === "/app";

  if (isAppPage) {
    return null;
  }

  return <Navbar />;
}
