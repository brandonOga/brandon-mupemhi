'use client';

export default function Header() {
  const menuItems = ['home', 'about', 'work', 'say hello'];

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-transparent ">
      <nav className="w-full h-20 flex items-center justify-between px-8">
        {/* Left Menu */}
        <ul className="flex gap-8">
          {menuItems.slice(0, 2).map((item) => (
            <li key={item}>
              <a href={`#${item}`} className="text-black uppercase text-sm font-medium hover:text-gray-300 transition">
                {item}
              </a>
            </li>
          ))}
        </ul>

        {/* Logo in Middle - Characters animate here */}

        {/* Right Menu */}
        <ul className="flex gap-8">
          {menuItems.slice(2).map((item) => (
            <li key={item}>
              <a href={`#${item}`} className="text-black uppercase text-sm font-medium hover:text-gray-300 transition">
                {item}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
