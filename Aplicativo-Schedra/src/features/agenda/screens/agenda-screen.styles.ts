import { StyleSheet } from "react-native";

import { fonts } from "../../../theme/tokens";

export const agendaStyles = StyleSheet.create({
  fabPressed: {
    transform: [{ scale: 0.94 }],
  },
  segmentedControl: {
    borderRadius: 9,
    borderWidth: 1,
    flexDirection: "row",
    gap: 5,
    marginTop: 12,
    padding: 4,
  },
  segment: {
    alignItems: "center",
    borderColor: "transparent",
    borderRadius: 7,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: 6,
    height: 39,
    justifyContent: "center",
    paddingHorizontal: 7,
  },
  segmentPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.98 }],
  },
  segmentText: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
  },
  segmentCount: {
    alignItems: "center",
    borderRadius: 8,
    height: 17,
    justifyContent: "center",
    minWidth: 17,
    paddingHorizontal: 4,
  },
  segmentCountText: {
    color: "#FFFFFF",
    fontFamily: fonts.bodyBold,
    fontSize: 9,
  },
  listHeading: {
    flex: 1,
    gap: 2,
  },
  dateFilter: {
    fontFamily: fonts.bodyMedium,
    fontSize: 10,
  },
  refreshButton: {
    alignItems: "center",
    borderRadius: 7,
    borderWidth: 1,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  rowPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.99 }],
  },
});
