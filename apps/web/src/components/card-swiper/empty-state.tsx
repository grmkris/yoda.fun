export function EmptyState() {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 rounded-2xl border border-dashed p-8 text-center">
      <div className="text-6xl">🎮</div>
      <div>
        <h3 className="mb-2 font-semibold text-xl">All Done!</h3>
        <p className="text-muted-foreground text-sm">
          You've reviewed all available games.
          <br />
          Check back later for more!
        </p>
      </div>
    </div>
  );
}
