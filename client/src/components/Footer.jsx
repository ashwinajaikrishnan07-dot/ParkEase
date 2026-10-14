export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <span><strong>Park</strong><span style={{ color: '#8a6a00' }}>Ease</span> — find parking, skip the traffic</span>
        <span>© {new Date().getFullYear()} ParkEase. Parking made easy across Coimbatore.</span>
      </div>
    </footer>
  );
}
