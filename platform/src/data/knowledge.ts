import type { KnowledgeTopic } from "@/lib/domain";

export const knowledgeTopics: KnowledgeTopic[] = [
  { id: "fractions", domain: "Arithmetic", title: "Fractions & Decimals", description: "Equivalent forms, operations, and comparisons." },
  { id: "ratios", domain: "Arithmetic", title: "Ratios & Proportions", description: "Rates, scale, percent, and proportional reasoning." },
  { id: "percent", domain: "Arithmetic", title: "Percent Change", description: "Discounts, growth, tax, and reverse percent." },
  { id: "averages", domain: "Arithmetic", title: "Averages", description: "Mean, weighted mean, and missing values." },
  { id: "integers", domain: "Number Theory", title: "Integers & Divisibility", description: "Factors, multiples, parity, and divisibility tests." },
  { id: "primes", domain: "Number Theory", title: "Prime Factorization", description: "Prime powers, GCF, LCM, and divisor counts." },
  { id: "remainders", domain: "Number Theory", title: "Remainders", description: "Cycles, modular patterns, and last digits." },
  { id: "digits", domain: "Number Theory", title: "Digits & Bases", description: "Place value, digit conditions, and representations." },
  { id: "expressions", domain: "Algebra", title: "Expressions", description: "Simplifying, substitution, and translating words." },
  { id: "equations", domain: "Algebra", title: "Equations", description: "Linear equations, systems, and constraints." },
  { id: "sequences", domain: "Algebra", title: "Sequences & Patterns", description: "Arithmetic patterns and recursive relationships." },
  { id: "coordinate", domain: "Algebra", title: "Coordinate Plane", description: "Slope intuition, distance, and lattice points." },
  { id: "angles", domain: "Geometry", title: "Angles", description: "Lines, polygons, and angle chasing." },
  { id: "triangles", domain: "Geometry", title: "Triangles", description: "Area, similarity, Pythagorean theorem, and centers." },
  { id: "quadrilaterals", domain: "Geometry", title: "Quadrilaterals", description: "Rectangles, parallelograms, trapezoids, and area." },
  { id: "circles", domain: "Geometry", title: "Circles", description: "Radius, circumference, area, arcs, and sectors." },
  { id: "solid", domain: "Geometry", title: "Solid Geometry", description: "Volume, surface area, nets, and spatial reasoning." },
  { id: "transformations", domain: "Geometry", title: "Transformations", description: "Symmetry, rotations, reflections, and scaling." },
  { id: "counting", domain: "Counting & Probability", title: "Systematic Counting", description: "Lists, cases, multiplication principle, and complements." },
  { id: "permutations", domain: "Counting & Probability", title: "Arrangements", description: "Ordered selections and restrictions." },
  { id: "probability", domain: "Counting & Probability", title: "Probability", description: "Sample spaces, dependent events, and expected outcomes." },
  { id: "sets", domain: "Counting & Probability", title: "Sets & Inclusion", description: "Venn diagrams and inclusion-exclusion." },
  { id: "charts", domain: "Statistics & Logic", title: "Tables & Charts", description: "Read, compare, and infer from data displays." },
  { id: "statistics", domain: "Statistics & Logic", title: "Statistics", description: "Median, mode, range, and distributions." },
  { id: "logic", domain: "Statistics & Logic", title: "Logic", description: "Ordering, truth conditions, and elimination." },
];

export const knowledgeDomains = [
  "Arithmetic",
  "Number Theory",
  "Algebra",
  "Geometry",
  "Counting & Probability",
  "Statistics & Logic",
] as const;
