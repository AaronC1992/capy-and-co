export function SalonRoom() {
  return <svg className="salon-room" viewBox="0 0 760 520" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs>
      <pattern id="wall-stripe" width="38" height="38" patternUnits="userSpaceOnUse"><rect width="19" height="38" fill="#f3eade" fillOpacity=".6" /></pattern>
      <linearGradient id="mirror" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#f6f4e9" /><stop offset=".6" stopColor="#e7eee3" /><stop offset="1" stopColor="#d6e4d9" /></linearGradient>
    </defs>
    <rect width="760" height="520" fill="#f6efe5" />
    <rect width="760" height="410" fill="url(#wall-stripe)" />
    <path d="M0 412h760v108H0Z" fill="#e8dacc" />
    <path d="M0 412h760" stroke="#d7c6b4" strokeWidth="8" />
    <path d="M90 520 222 414m260 0 147 106M0 468h760" stroke="#dfcebc" strokeWidth="2" />
    <path d="M204 402V198a176 176 0 0 1 352 0v204Z" fill="#c4af8e" />
    <path d="M215 395V199a165 165 0 0 1 330 0v196Z" fill="url(#mirror)" stroke="#ead8b7" strokeWidth="5" />
    <path d="M249 206V187q6-81 70-111" fill="none" stroke="#fff" strokeWidth="12" strokeLinecap="round" opacity=".6" />
    <path d="m462 104-87 128m148-63-47 72" stroke="#fff" strokeWidth="20" opacity=".19" />
    <path d="M623 0v79" stroke="#b19b79" strokeWidth="3" />
    <path d="M584 102q0-42 39-42t39 42Z" fill="#b0bd97" stroke="#97a584" strokeWidth="2" />
    <ellipse cx="623" cy="103" rx="38" ry="7" fill="#f6dfa2" />
    <rect x="59" y="143" width="88" height="113" rx="3" fill="#e7d3b7" transform="rotate(-5 100 200)" />
    <rect x="67" y="151" width="72" height="96" fill="#fff9ef" transform="rotate(-5 100 200)" />
    <path d="M102 226v-53m0 37c-29 0-26-27 0-10m0-5c24 0 28-29 0-12" fill="#b4c1a2" stroke="#8f9e81" strokeWidth="2" transform="rotate(-5 100 200)" />
    <rect x="0" y="355" width="158" height="10" rx="4" fill="#c4a27e" />
    <path d="M21 367v76m110-76v58" stroke="#b99172" strokeWidth="7" />
    <rect x="35" y="325" width="78" height="16" rx="6" fill="#d8a4a0" /><rect x="39" y="309" width="74" height="16" rx="6" fill="#f5e2c4" /><rect x="37" y="341" width="77" height="14" rx="5" fill="#b2bea5" />
    <path d="M644 395V264m0 64c-55-4-51-50 0-15m0-8c46-1 49-57 0-18m0 77c55-4 60-54 0-20" fill="#97ae88" stroke="#7d9974" strokeWidth="4" strokeLinecap="round" />
    <path d="M614 376h63l-8 58h-46Z" fill="#cf9c80" stroke="#ba8a71" strokeWidth="2" /><path d="M620 387h51" stroke="#e4b79d" strokeWidth="3" />
    <g transform="translate(583 181) rotate(5)"><rect width="83" height="48" rx="7" fill="#fcf8ef" stroke="#d4bd9c" strokeWidth="2" /><path d="M29 19c-7-10-21 4 12 18 33-14 19-28 12-18l-12 7Z" fill="#dda69e" /></g>
    <ellipse cx="380" cy="476" rx="188" ry="30" fill="#c7b29b" opacity=".2" />
  </svg>
}
