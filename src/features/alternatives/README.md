# Alternatives

After a Caution or Not safe verdict, suggest products that would pass the same
profile. Reached from the verdict screen.

- Queries `products` in the same `category` that clear the active profile rules.
- Each suggestion is itself checked by `src/services/verdict` before it is shown;
  never present an alternative that has not passed the same engine.
- Uses `ProductCard`. Button names the action: "See alternatives".
