---
"bejamas": patch
---

`bejamas docs:build` lists props declared through unions, intersections and local type references, such as `type Props = (AsButton | AsAnchor) & OwnProps`, instead of dropping the Props table.
