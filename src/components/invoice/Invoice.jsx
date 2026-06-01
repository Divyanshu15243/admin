import React from "react";
import { TableCell, TableBody, TableRow } from "@windmill/react-ui";
import { useQuery } from "@tanstack/react-query";
import AttributeServices from "@/services/AttributeServices";
import useUtilsFunction from "@/hooks/useUtilsFunction";

const SKIP_KEYS = new Set(['_id','price','originalPrice','quantity','discount','productId','barcode','sku','image','profit']);

const getVariantLabel = (variant, attributes) => {
  if (!variant || !attributes?.length) return null;
  const parts = [];
  Object.keys(variant).forEach((key) => {
    if (SKIP_KEYS.has(key)) return;
    const attr = attributes.find((a) => a._id === key);
    if (!attr) return;
    const child = attr.variants?.find((v) => v._id === variant[key]);
    if (child) {
      const name = typeof child.name === 'object' ? (child.name?.en || Object.values(child.name)[0]) : child.name;
      if (name) parts.push(name);
    }
  });
  return parts.length ? parts.join(' / ') : null;
};

const getTitle = (title) => {
  if (typeof title === 'object') return title?.en || title?.de || Object.values(title)[0] || '';
  return title || '';
};

const Invoice = ({ data, currency, getNumberTwo }) => {
  const { showingTranslateValue } = useUtilsFunction();

  const { data: attributes } = useQuery({
    queryKey: ['attributes-show'],
    queryFn: () => AttributeServices.getShowingAttributes({}),
    staleTime: 10 * 60 * 1000,
  });

  return (
    <>
      <TableBody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 text-serif text-sm">
        {data?.cart?.map((item, i) => {
          const baseTitle = getTitle(item.title).replace(/\s*\([a-f0-9]{24}\s*\/\s*[\d.]+\)/gi, '').trim();
          const variantLabel = getVariantLabel(item.variant, attributes);
          return (
            <TableRow key={i} className="dark:border-gray-700 dark:text-gray-400">
              <TableCell className="px-6 py-1 whitespace-nowrap font-normal text-gray-500 text-left">
                {i + 1}
              </TableCell>
              <TableCell className="px-6 py-1 font-normal text-gray-500">
                <span className="text-gray-700 font-semibold dark:text-gray-300 text-xs">
                  {baseTitle}
                  {variantLabel && (
                    <span className="text-emerald-600 font-medium"> ({variantLabel})</span>
                  )}
                </span>
              </TableCell>
              <TableCell className="px-6 py-1 whitespace-nowrap font-bold text-center">
                {item.quantity}
              </TableCell>
              <TableCell className="px-6 py-1 whitespace-nowrap font-bold text-center">
                {currency}{getNumberTwo(item.price)}
              </TableCell>
              <TableCell className="px-6 py-1 whitespace-nowrap text-right font-bold text-red-500 dark:text-emerald-500">
                {currency}{getNumberTwo(item.itemTotal)}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </>
  );
};

export default Invoice;
