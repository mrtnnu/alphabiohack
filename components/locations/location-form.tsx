"use client";

import { ALLOWED_MIME_TYPES, MAX_FILE_SIZES, STORAGE_BUCKETS, STORAGE_PATHS } from "@/lib/config/storage";
import { Building2, ChevronDown, ChevronUp, MapPin, RotateCcw, Save, Trash2, Upload, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dropzone, DropzoneContent, DropzoneEmptyState } from "@/components/ui/dropzone";
import React, { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Location } from "@/types";
import { useSupabaseUpload } from "@/hooks";
import { useTranslations } from "next-intl";

interface LocationFormProps {
  location?: Location;
  isNew: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  onCancel: () => void;
  onSave: () => void;
  onSubmit?: (formData: { title: string; address: string; description: string; logo: string; lat: number; lon: number }) => Promise<void>;
  onDelete?: () => Promise<void>;
  loading?: boolean;
}

export function LocationForm({
  location,
  isNew,
  isExpanded,
  onToggle,
  onCancel,
  onSubmit,
  onDelete,
  loading = false,
}: LocationFormProps) {
  const t = useTranslations("Locations");
  const [formData, setFormData] = useState({
    title: location?.title || "",
    address: location?.address || "",
    description: location?.description || "",
    logo: location?.logo || "",
    lat: location?.lat || 0,
    lon: location?.lon || 0,
  });

  // Determine if the coordinates are missing.  If either latitude or
  // longitude is falsy (e.g. 0), we consider the coordinates not set
  // and will show a helper message and disable the save button.
  const coordinatesMissing = !formData.lat || !formData.lon;

  // Hook para subida de logo
  const logoUpload = useSupabaseUpload({
    bucketName: STORAGE_BUCKETS.LOCATIONS,
    path: STORAGE_PATHS.LOCATION_LOGOS,
    allowedMimeTypes: ALLOWED_MIME_TYPES.IMAGES,
    maxFiles: 1,
    maxFileSize: MAX_FILE_SIZES.MEDIUM, // 4MB
  });

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Efecto para actualizar el logo cuando se complete el upload
  React.useEffect(() => {
    if (logoUpload.successes.length > 0 && logoUpload.successes[0] !== formData.logo) {
      setFormData(prev => ({ ...prev, logo: logoUpload.successes[0] }));
    }
  }, [logoUpload.successes, formData.logo]);

  const handleLogoRemove = () => {
    logoUpload.setFiles([]);
    setFormData(prev => ({ ...prev, logo: "" }));
  };

  const handleDelete = async () => {
    if (onDelete) {
      await onDelete();
    }
  };

  return (
    <Card className="p-0 rounded-lg">
      <Collapsible open={isExpanded} onOpenChange={onToggle}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-700/50 p-4 sm:p-6 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="flex-shrink-0">
                  <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1 min-w-0 overflow-hidden">
                  <CardTitle className="text-base sm:text-lg md:text-xl font-semibold text-slate-900 dark:text-slate-100 wrap-break-word">
                    {isNew ? t("addNewClinic") : formData.title || t("clinic")}
                  </CardTitle>
                  {!isNew && formData.address && (
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 wrap-break-word">
                      {formData.address}
                    </p>
                  )}
                </div>
                {isNew && (
                  <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 border-green-200 dark:border-green-800 flex-shrink-0">
                    {t("new")}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {!isNew && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20 p-2 h-8 w-8 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete();
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="p-4 sm:p-6 space-y-6">
            {/* Logo Upload */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Upload className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <Label className="text-sm font-medium text-slate-900 dark:text-slate-100">{t("logo")}</Label>
              </div>
              
              {/* Preview del logo actual */}
              {formData.logo && (
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 rounded-lg flex items-center justify-center border-2 border-slate-200 dark:border-slate-600 overflow-hidden shadow-sm">
                      <Image
                        src={formData.logo}
                        alt="Logo"
                        width={96}
                        height={96}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{t("currentLogo")}</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">{t("logoUploaded")}</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20 border-red-200 dark:border-red-800"
                    onClick={handleLogoRemove}
                  >
                    <X className="h-3 w-3 mr-1" />
                    {t("remove")}
                  </Button>
                </div>
              )}

              {/* Dropzone para nuevo logo */}
              {!formData.logo && (
                <div className="space-y-2">
                  <Dropzone {...logoUpload} className="max-w-md mx-auto sm:mx-0">
                    <DropzoneEmptyState />
                    <DropzoneContent />
                  </Dropzone>
                  <p className="text-xs text-slate-600 dark:text-slate-400 text-center sm:text-left">
                    {t("imageGuidelines")}
                  </p>
                </div>
              )}
            </div>

            {/* Form Fields */}
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  {t("basicInformation")}
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("clinicName")}</Label>
                    <Input
                      value={formData.title}
                      onChange={(e) => handleInputChange("title", e.target.value)}
                      placeholder={t("clinicNamePlaceholder")}
                      className="h-10 border-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("address")}</Label>
                    <Input
                      value={formData.address}
                      onChange={(e) => handleInputChange("address", e.target.value)}
                      placeholder={t("addressPlaceholder")}
                      className="h-10 border-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("description")}</Label>
                  <Input
                    value={formData.description}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                    placeholder={t("descriptionPlaceholder")}
                    className="h-10 border-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              {/* Location Coordinates */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    {t("coordinates")}
                  </h3>
                  {coordinatesMissing && (
                    <span className="text-xs text-red-500">
                      {/* Show static English message; adjust translation if available */}
                      Please add the coordinates
                    </span>
                  )}
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("latitude")}</Label>
                    <Input
                      type="number"
                      step="any"
                      value={formData.lat}
                      onChange={(e) => handleInputChange("lat", parseFloat(e.target.value) || 0)}
                      placeholder={t("latitudePlaceholder")}
                      className="h-10 border-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                      required 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("longitude")}</Label>
                    <Input
                      type="number"
                      step="any"
                      value={formData.lon}
                      onChange={(e) => handleInputChange("lon", parseFloat(e.target.value) || 0)}
                      placeholder={t("longitudePlaceholder")}
                      className="h-10 border-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                      required 
                    />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Form Actions */}
            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
              <Button
                variant="outline"
                onClick={onCancel}
                disabled={loading}
                className="w-full sm:w-auto"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                {t("reset")}
              </Button>
              {onSubmit && (
                <Button
                  onClick={() => onSubmit(formData)}
                  disabled={loading || coordinatesMissing}
                  className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? t("saving") : (isNew ? t("create") : t("update"))}
                </Button>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}