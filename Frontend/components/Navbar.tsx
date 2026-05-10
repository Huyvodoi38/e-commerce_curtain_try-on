import Link from "next/link";

const navItems = [
  { href: "/", label: "Trang chủ" },
  { href: "/products", label: "Sản phẩm" },
  { href: "/tryon", label: "AI Try-on" },
  { href: "/about", label: "Giới thiệu" },
];

export default function Navbar() {
  return (
    <header className="border-b border-brand-200/60 bg-brand-50/80 backdrop-blur sticky top-0 z-40">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-xl font-semibold tracking-tight text-brand-700">
          Rèm AI
        </Link>

        <ul className="flex gap-6 text-sm font-medium text-brand-800">
          {navItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="transition-colors hover:text-brand-500"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>

        <Link
          href="/tryon"
          className="rounded-full bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700"
        >
          Thử rèm ngay
        </Link>
      </nav>
    </header>
  );
}
