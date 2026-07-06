## 2025-05-16 - [Optimize History Processing in LLM Engine]
**Learning:** Mapping over a large conversation history to sanitize messages before slicing for the LLM prompt is inefficient. Slicing first significantly reduces the number of objects created and processed.
**Action:** Always slice history arrays to the desired context window before performing any mapping or transformation operations in LLM engines.
