import { useContext, useEffect, useState } from "react";
import { useForm } from "react-hook-form";

//internal import
import { SidebarContext } from "@/context/SidebarContext";
import CustomerServices from "@/services/CustomerServices";
import { notifyError, notifySuccess } from "@/utils/toast";

const useCustomerSubmit = (id) => {
  const [imageUrl, setImageUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { closeDrawer, setIsUpdate } = useContext(SidebarContext);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm();

  const onSubmit = async (data) => {
    try {
      setIsSubmitting(true);
      const customerData = {
        name: data.name,
        email: data.email,
        phone: data.phone,
        address: data.address,
      };

      if (id) {
        const res = await CustomerServices.updateCustomer(id, customerData);

        // if wallet balance changed, update via dedicated endpoint (creates Transaction record)
        if (data.walletBalance !== undefined && data.walletBalance !== "") {
          const currentRes = await CustomerServices.getCustomerById(id);
          const newAmount = parseFloat(data.walletBalance);
          if (!isNaN(newAmount) && newAmount !== (currentRes.walletBalance || 0)) {
            await CustomerServices.updateWalletBalance(id, newAmount, "Admin manual wallet update");
          }
        }

        setIsUpdate(true);
        notifySuccess(res.message);
        closeDrawer();
      }
      setIsSubmitting(false);
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
      closeDrawer();
    }
  };

  useEffect(() => {
    if (id) {
      (async () => {
        try {
          const res = await CustomerServices.getCustomerById(id);
          if (res) {
            setValue("name", res.name);
            setValue("phone", res.phone);
            setValue("email", res.email);
            setValue("address", res.address);
            setValue("walletBalance", res.walletBalance || 0);
          }
        } catch (err) {
          notifyError(err?.response?.data?.message || err?.message);
        }
      })();
    }
  }, [id, setValue]);

  return {
    register,
    handleSubmit,
    onSubmit,
    errors,
    setImageUrl,
    imageUrl,
    isSubmitting,
  };
};

export default useCustomerSubmit;
