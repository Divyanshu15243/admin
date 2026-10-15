import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import AttributeServices from "@/services/AttributeServices";
import useUtilsFunction from "@/hooks/useUtilsFunction";

// variant keys that are not attribute selections
const VARIANT_META_KEYS = [
  "_id",
  "price",
  "originalPrice",
  "quantity",
  "discount",
  "productId",
  "barcode",
  "sku",
  "image",
  "profit",
];

// turns a variant like { <attrId>: <valueId>, price, quantity } into "10kg / Red"
const useVariantLabel = () => {
  const { showingTranslateValue } = useUtilsFunction();

  const { data: attributesData } = useQuery({
    queryKey: ["all-attributes"],
    queryFn: () => AttributeServices.getShowingAttributes({}),
  });

  // flat map: { attributeId: { name, children: { childId: childName } } }
  const attrMap = useMemo(() => {
    const map = {};
    (attributesData || []).forEach((attr) => {
      map[attr._id] = {
        name: showingTranslateValue(attr.name),
        children: {},
      };
      attr.values?.forEach((child) => {
        map[attr._id].children[child._id] = showingTranslateValue(child.name);
      });
    });
    return map;
  }, [attributesData, showingTranslateValue]);

  const getVariantLabel = (variant) => {
    if (!variant) return "Default";
    const parts = [];
    Object.keys(variant).forEach((key) => {
      if (VARIANT_META_KEYS.includes(key)) return;
      const valueName = attrMap[key]?.children[variant[key]] || variant[key];
      if (valueName && typeof valueName !== "object") parts.push(valueName);
    });
    return parts.join(" / ") || "Default";
  };

  return { attrMap, getVariantLabel };
};

export default useVariantLabel;
