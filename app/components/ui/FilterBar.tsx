interface FilterBarProps {
  tags: string[];
  active: string;
  onFilter: (tag: string) => void;
  variant?: "default" | "sale";
}

export function FilterBar({ tags, active, onFilter, variant = "default" }: FilterBarProps) {
  return (
    <div className={`filters${variant === "sale" ? " sort-btns" : ""}`}>
      {tags.map((tag) => (
        <button
          key={tag}
          className={`filter-btn${active === tag ? " active" : ""}`}
          onClick={() => onFilter(tag)}
        >
          {tag}
        </button>
      ))}
    </div>
  );
}
