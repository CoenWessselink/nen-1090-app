
import React from "react";
import { getWeldName } from "@/utils/weldName";

export default function WeldHeader({ weld, index }: any) {
  return <h1>{getWeldName(weld, index)}</h1>;
}
