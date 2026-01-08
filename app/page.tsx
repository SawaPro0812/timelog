import Link from "next/link";

export default function Home() {
  return (
    <main style={{ padding: 24 }}>
      <h1>TimeLog</h1>
      <ul>
        <li><Link href="/login">Login</Link></li>
        <li><Link href="/presets">Presets</Link></li>
        <li><Link href="/sessions">履歴</Link></li>
      </ul>
    </main>
  );
}
