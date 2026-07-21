export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col justify-center px-6 max-w-sm mx-auto">
      {children}
    </div>
  );
}
