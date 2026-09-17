'use server';

/* eslint-disable @typescript-eslint/no-explicit-any */
import { createAdminClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function getGroups(): Promise<any[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('groups')
    .select('*, group_categories(name)')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching groups:', error);
    return [];
  }
  return data || [];
}

export async function getGroupCategories(): Promise<any[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('group_categories')
    .select('*')
    .order('name');
  
  if (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
  return data || [];
}

export async function createGroup(formData: FormData) {
  const supabase = createAdminClient();
  
  const category_id = formData.get('category_id') as string;
  const data = {
    name: formData.get('name') as string,
    facebook_url: formData.get('facebook_url') as string,
    category_id: category_id === 'null' ? null : category_id,
    location: formData.get('location') as string,
    description: formData.get('description') as string,
    approximate_member_count: parseInt(formData.get('approximate_member_count') as string) || null,
    status: formData.get('status') as string || 'Pending Review',
    notes: formData.get('notes') as string,
  };

  const { error } = await supabase.from('groups').insert(data);
  if (error) {
    console.error('Error creating group:', error);
    throw new Error('Failed to create group');
  }

  revalidatePath('/groups');
  redirect('/groups');
}

export async function getGroupById(id: string): Promise<any> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('groups')
    .select('*, group_categories(name), group_rules(*)')
    .eq('id', id)
    .single();
  
  if (error) {
    console.error('Error fetching group:', error);
    return null;
  }
  return data;
}

export async function updateGroup(id: string, formData: FormData) {
  const supabase = createAdminClient();
  const category_id = formData.get('category_id') as string;
  const data = {
    name: formData.get('name') as string,
    facebook_url: formData.get('facebook_url') as string,
    category_id: category_id === 'null' ? null : category_id,
    location: formData.get('location') as string,
    description: formData.get('description') as string,
    approximate_member_count: parseInt(formData.get('approximate_member_count') as string) || null,
    status: formData.get('status') as string || 'Pending Review',
    notes: formData.get('notes') as string,
  };

  const { error } = await supabase.from('groups').update(data).eq('id', id);
  if (error) {
    console.error('Error updating group:', error);
    throw new Error('Failed to update group');
  }

  revalidatePath(`/groups/${id}`);
  revalidatePath('/groups');
  redirect(`/groups/${id}`);
}
export async function createGroupRule(groupId: string, formData: FormData) {
  const supabase = createAdminClient();
  const data = {
    group_id: groupId,
    rule_type: formData.get('rule_type') as string,
    description: formData.get('description') as string,
    value: formData.get('value') as string,
    source: formData.get('source') as string,
    evidence: formData.get('evidence') as string,
    status: formData.get('status') as string || 'Unknown',
    notes: formData.get('notes') as string,
  };

  const { error } = await supabase.from('group_rules').insert(data);
  if (error) {
    console.error('Error creating group rule:', error);
    throw new Error('Failed to create group rule');
  }

  revalidatePath(`/groups/${groupId}`);
}
