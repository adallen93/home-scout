export default function Footer() {
  return (
    <footer
      className="px-4 py-3 text-center text-xs"
      style={{ borderTop: '1px solid var(--color-border)', color: 'var(--color-muted)' }}
    >
      Map data &copy;{' '}
      <a
        href="https://www.openstreetmap.org/copyright"
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: 'var(--color-accent)' }}
      >
        OpenStreetMap contributors
      </a>
    </footer>
  )
}
