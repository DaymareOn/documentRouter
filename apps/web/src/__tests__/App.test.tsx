import { render } from '@testing-library/react';
import App from '../App';
import '../i18n';

describe('App', () => {
  it('renders without crashing', () => {
    const { container } = render(<App />);
    expect(container).toBeTruthy();
  });
});
