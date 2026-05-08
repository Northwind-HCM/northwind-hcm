type FormFieldProps = {
  label: string;
  helper?: string;
  required?: boolean;
  children: React.ReactNode;
};

export default function FormField({
  label,
  helper,
  required = false,
  children,
}: FormFieldProps) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-semibold text-gray-900">
        {label} {required && <span className="text-red-600">*</span>}
      </label>

      {helper && <p className="text-xs text-gray-500">{helper}</p>}

      {children}
    </div>
  );
}