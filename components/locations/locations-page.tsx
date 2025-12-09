"use client";

import { AlertCircle, Building2, MapPin, Plus } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { useLocationOperations, useLocations } from "@/hooks";

import { AsyncWrapper } from "@/components/ui/async-wrapper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LocationForm } from "./location-form";
import { useState } from "react";
import { useTranslations } from "next-intl";

export function LocationsPage() {
  const t = useTranslations("Locations");
  const tc = useTranslations("Common");
  const { locations, refetch, loading: locationsLoading, error: locationsError } = useLocations();
  const { createLocation, updateLocation, deleteLocation, loading, error } = useLocationOperations();
  const [expandedLocation, setExpandedLocation] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [locationIdToDelete, setLocationIdToDelete] = useState<string | null>(null);

  const handleToggleExpanded = (locationId: string) => {
    setExpandedLocation(expandedLocation === locationId ? null : locationId);
  };

  const handleAddNew = () => {
    setIsAddingNew(true);
    setExpandedLocation("new");
  };

  const handleCancel = () => {
    setIsAddingNew(false);
    setExpandedLocation(null);
  };

  const handleSave = async () => {
    // Esta función se ejecuta desde los botones globales
    // La lógica específica se maneja en cada LocationForm
    setIsAddingNew(false);
    setExpandedLocation(null);
  };

  // Accept latitude and longitude when creating a location.
  // These fields are required by the backend to calculate the correct
  // timezone and must be passed along with the basic information.  If
  // lat or lon are missing the LocationForm will prevent submission.
  const handleCreateLocation = async (formData: { title: string; address: string; description: string; logo: string; lat: number; lon: number }) => {
    const result = await createLocation(formData);
    if (result) {
      await refetch();
      handleCancel();
    }
  };

  // Accept latitude and longitude when updating a location.  These may
  // be undefined if the coordinates are not changed, but when they are
  // provided they will be used to recalculate the timezone.  The
  // LocationForm ensures lat and lon are present on submission.
  const handleUpdateLocation = async (id: string, formData: { title: string; address: string; description: string; logo: string; lat: number; lon: number }) => {
    const result = await updateLocation(id, formData);
    if (result) {
      await refetch();
    }
  };

  const handleDeleteLocation = (id: string) => {
    setLocationIdToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!locationIdToDelete) return;
    const success = await deleteLocation(locationIdToDelete);
    if (success) {
      await refetch();
      handleCancel();
    }
    setDeleteDialogOpen(false);
    setLocationIdToDelete(null);
  };

  const handleRetry = () => {
    refetch();
  };

  return (
    <AsyncWrapper
      loading={locationsLoading}
      error={locationsError}
      data={locations}
      skeletonProps={{
        title: t("title"),
        description: t("description"),
        variant: "default"
      }}
      errorProps={{
        title: t("errorTitle"),
        description: t("errorLoadingLocations"),
        onRetry: handleRetry,
        variant: "card"
      }}
    >
      <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Building2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                {t("title")}
              </h1>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
                
          {t("manageLocations")}
              </p>
            </div>
            <Button 
              onClick={handleAddNew} 
              disabled={loading}
              className="self-start sm:self-center bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
            >
              <Plus className="h-4 w-4 mr-2" />
              {t("addNewClinic")}
            </Button>
          </div>
          
          {/* Stats */}
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border-blue-200 dark:border-blue-800">
              <MapPin className="h-3 w-3 mr-1" />
              {t("totalLocations", { count: locations.length })}
            </Badge>
            {isAddingNew && (
              <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 border-green-200 dark:border-green-800">
                {t("addingNew")}
              </Badge>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <Card className="shadow-lg border-0 bg-red-50/80 dark:bg-red-900/20 backdrop-blur-sm border-red-200 dark:border-red-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 text-red-700 dark:text-red-400">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <p className="text-sm">{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* New Location Form */}
        {isAddingNew && (
          <LocationForm
            isNew={true}
            isExpanded={expandedLocation === "new"}
            onToggle={() => handleToggleExpanded("new")}
            onCancel={handleCancel}
            onSave={handleSave}
            onSubmit={handleCreateLocation}
            loading={loading}
          />
        )}

        {/* Existing Locations */}
        <div className="space-y-4">
          {locations.length === 0 ? (
            <Card className="shadow-none border-none p-0">
              <CardContent className="p-0">
                <div className="flex flex-col items-center gap-6 text-center">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full blur-lg opacity-20"></div>
                    <Building2 className="h-16 w-16 text-blue-600 dark:text-blue-400 relative z-10" />
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                      {t("noLocations")}
                    </h3>
                    <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-md">
                      {t("noLocationsDescription")}
                    </p>
                  </div>
                  <Button 
                    onClick={handleAddNew}
                    className="mt-4 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {t("addFirstLocation")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            locations.map((location) => (
              <LocationForm
                key={location.id}
                location={location}
                isNew={false}
                isExpanded={expandedLocation === location.id}
                onToggle={() => handleToggleExpanded(location.id)}
                onCancel={handleCancel}
                onSave={handleSave}
                onSubmit={(formData) => handleUpdateLocation(location.id, formData)}
                onDelete={async () => { handleDeleteLocation(location.id) }}
                loading={loading}
              />
            ))
          )}
        </div>

        {/* Global Actions */}
        {(isAddingNew || expandedLocation) && (
          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-slate-200 dark:border-slate-700">
            <Button 
              variant="outline" 
              onClick={handleCancel}
              className="w-full sm:w-auto"
            >
              {t("cancel")}
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={loading}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? t("saving") : t("saveChanges")}
            </Button>
          </div>
        )}
      </div>
    </div>

    {/* Delete confirmation dialog */}
    <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("confirmDelete")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("confirmDeleteDescription")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="cursor-pointer" disabled={loading}>{tc("cancel")}</AlertDialogCancel>
          <AlertDialogAction className="cursor-pointer" onClick={confirmDelete} disabled={loading}>
            {tc("delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </AsyncWrapper>
  );
}
