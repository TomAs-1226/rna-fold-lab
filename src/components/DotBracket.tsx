// Shows the sequence over its dots-and-brackets shape, in monospace so they line up.
// A "(" or ")" means that base is paired; a "." means it is free.
export function DotBracket({
  sequence,
  structure,
  seedStart,
}: {
  sequence: string;
  structure: string;
  seedStart?: number;
}) {
  if (!sequence) return null;
  return (
    <div className="overflow-x-auto rounded-lg border border-line bg-bg/60 p-3">
      <div className="font-mono text-sm leading-6 whitespace-pre">
        <div>
          {[...sequence].map((c, i) => {
            const isSeed = seedStart !== undefined && i >= seedStart;
            const paired = structure[i] !== ".";
            return (
              <span key={i} style={{ color: isSeed ? "#F5B056" : paired ? "#E7EEF7" : "#5C6F75" }}>
                {c}
              </span>
            );
          })}
        </div>
        <div className="text-teal">{structure}</div>
      </div>
    </div>
  );
}
