'use client';

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <html>
            <body style={{ fontFamily: 'monospace', padding: '32px', background: '#fef2f2' }}>
                <h1 style={{ color: '#991b1b', fontSize: '20px', marginBottom: '12px' }}>
                    Runtime Error — {error.message}
                </h1>
                <pre style={{
                    background: '#fff',
                    border: '1px solid #fca5a5',
                    borderRadius: '8px',
                    padding: '16px',
                    fontSize: '12px',
                    overflowX: 'auto',
                    whiteSpace: 'pre-wrap',
                    color: '#7f1d1d',
                }}>
                    {error.stack}
                    {error.digest ? `\n\nDigest: ${error.digest}` : ''}
                </pre>
                <button
                    onClick={reset}
                    style={{
                        marginTop: '16px',
                        padding: '8px 16px',
                        background: '#dc2626',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                    }}
                >
                    Retry
                </button>
            </body>
        </html>
    );
}
