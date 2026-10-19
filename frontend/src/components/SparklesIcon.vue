<template>
  <!-- The Auditor assistant's mark: a coin bearing the rupee sign, in an
  indigo-to-pink gradient bright enough to read on both light and dark
  backgrounds. Kept to two simple shapes (ring + glyph) rather than a
  multi-part scene so it still reads clearly at the ~14px size the
  sidebar's collapsed badge renders it at. -->
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
    <defs>
      <linearGradient id="creche-reports-ai-glow" x1="3" y1="21" x2="21" y2="3" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="#818cf8" />
        <stop offset="0.55" stop-color="#c084fc" />
        <stop offset="1" stop-color="#f472b6" />
      </linearGradient>
    </defs>
    <circle cx="12" cy="12" r="9.5" fill="none" stroke="url(#creche-reports-ai-glow)" stroke-width="1.8" />
    <path
      d="M8.3 7.6h7.1M8.3 10.6h7.1M8.3 7.6c3.3 0 5.1 1.1 5.1 3s-1.8 3-5.1 3M8.3 13.6l5.8 5"
      stroke="url(#creche-reports-ai-glow)"
      stroke-width="1.7"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
</template>
