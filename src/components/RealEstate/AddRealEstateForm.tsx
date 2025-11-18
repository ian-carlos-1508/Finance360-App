import React, { useState, useEffect } from 'react';
import styles from '../../pages/Settings/Settings.module.css';
import { supabase } from '../../lib/supabaseClient';

export type RealEstate = {
  property_id: string;
  name: string;
  address: string | null;
  market_value: number;
};

interface AddRealEstateFormProps {
  propertyToEdit: RealEstate | null;
  onSave: (newProperty: RealEstate) => void;
  onCancel: () => void;
}

function AddRealEstateForm({ propertyToEdit, onSave, onCancel }: AddRealEstateFormProps) {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [marketValue, setMarketValue] = useState('0');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (propertyToEdit) {
      setName(propertyToEdit.name);
      setAddress(propertyToEdit.address || '');
      setMarketValue(propertyToEdit.market_value.toString());
    } else {
      setName('');
      setAddress('');
      setMarketValue('0');
    }
  }, [propertyToEdit]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const propertyData = {
      name,
      address: address || null,
      market_value: parseFloat(marketValue) || 0,
    };

    let savedProperty: RealEstate | null = null;
    let dbError: any = null;

    if (propertyToEdit) {
      const { data, error } = await supabase
        .from('real_estate')
        .update(propertyData)
        .match({ property_id: propertyToEdit.property_id })
        .select()
        .single();
      savedProperty = data;
      dbError = error;
    } else {
      const { data, error } = await supabase
        .from('real_estate')
        .insert(propertyData)
        .select()
        .single();
      savedProperty = data;
      dbError = error;
    }

    if (dbError) {
      setError(dbError.message);
    } else if (savedProperty) {
      onSave(savedProperty);
    }
    setLoading(false);
  };

  return (
    <form className={styles.modalForm} onSubmit={handleSave}>
      <div className={styles.formRow}>
        <label className={styles.label} htmlFor="prop-name">Property Name</label>
        <input
          id="prop-name"
          className={styles.input}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., My Condo"
          required
        />
      </div>
      <div className={styles.formRow}>
        <label className={styles.label} htmlFor="prop-address">Address</label>
        <input
          id="prop-address"
          className={styles.input}
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="(Optional)"
        />
      </div>
      <div className={styles.formRow}>
        <label className={styles.label} htmlFor="prop-value">Market Value</label>
        <input
          id="prop-value"
          className={styles.input}
          type="number"
          step="0.01"
          value={marketValue}
          onChange={(e) => setMarketValue(e.target.value)}
          required
        />
      </div>
      {error && <p className={styles.errorText}>{error}</p>}
      <div className={styles.modalFooter}>
        <button type="button" className={styles.cancelButton} onClick={onCancel} disabled={loading}>
          Cancel
        </button>
        <button type="submit" className={styles.saveButton} disabled={loading}>
          {loading ? 'Saving...' : (propertyToEdit ? 'Save Changes' : 'Save Property')}
        </button>
      </div>
    </form>
  );
}

export default AddRealEstateForm;