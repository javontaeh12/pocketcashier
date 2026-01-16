const colors = [
  { from: '#667eea', to: '#764ba2' },
  { from: '#f093fb', to: '#f5576c' },
  { from: '#4facfe', to: '#00f2fe' },
  { from: '#43e97b', to: '#38f9d7' },
  { from: '#fa709a', to: '#fee140' },
  { from: '#30cfd0', to: '#330867' },
  { from: '#a8edea', to: '#fed6e3' },
  { from: '#ff9a56', to: '#ff6a88' },
  { from: '#2e2e78', to: '#662e9b' },
  { from: '#f5576c', to: '#f093fb' },
];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

export function getPlaceholderGradient(groupName: string): { from: string; to: string } {
  const hash = hashString(groupName);
  const index = hash % colors.length;
  return colors[index];
}

export function getPlaceholderStyle(groupName: string): React.CSSProperties {
  const gradient = getPlaceholderGradient(groupName);
  return {
    backgroundImage: `linear-gradient(135deg, ${gradient.from} 0%, ${gradient.to} 100%)`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  };
}

export function getPlaceholderPreview(groupName: string): string {
  const gradient = getPlaceholderGradient(groupName);
  return `linear-gradient(135deg, ${gradient.from} 0%, ${gradient.to} 100%)`;
}
