import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('ParkEase UI error:', error, info);
  }

  handleReload = () => {
    this.setState({ hasError: false });
    window.location.assign('/');
  };

  render() {
    if (this.state.hasError) {
      return (
        <main className="status-card" role="alert">
          <p className="eyebrow">Something went wrong</p>
          <h1>Unexpected error</h1>
          <p className="summary">The page ran into a problem. Returning home usually resolves it.</p>
          <button className="primary-button" onClick={this.handleReload} type="button">Return home</button>
        </main>
      );
    }

    return this.props.children;
  }
}
