import { type SupabaseClient } from 'npm:@supabase/supabase-js@2.49.4'
import { type Database } from './types/database.types.ts'

type WatchChannel = Database['public']['Tables']['watch_channels']['Row'];

/**
 * Fetches all watch channels that are set to expire before the given threshold.
 *
 * @param supabase - The Supabase client instance.
 * @param threshold - An ISO string representing the expiration cut-off time.
 * @returns A promise that resolves to an array of expiring watch channels.
 * @throws An error if the database query fails.
 */
export async function getExpiringChannels(supabase: SupabaseClient<Database>, threshold: string): Promise<WatchChannel[]> {
    const { data, error } = await supabase
      .from('watch_channels')
      .select('*')
      .lt('expiration_timestamp', threshold);

    if (error) {
      throw new Error(`Failed to query for expiring channels: ${error.message}`);
    }
    return data || [];
}

/**
 * Updates the expiration timestamp for a specific watch channel.
 *
 * @param supabase - The Supabase client instance.
 * @param channelId - The unique ID of the channel to update.
 * @param newExpiration - An ISO string for the new expiration time.
 * @throws An error if the database update fails.
 */
export async function updateChannelExpiration(supabase: SupabaseClient<Database>, channelId: string, newExpiration: string) {
    const { error } = await supabase
        .from('watch_channels')
        .update({ expiration_timestamp: newExpiration })
        .eq('channel_id', channelId);

    if (error) {
        throw new Error(`Failed to update channel expiration: ${error.message}`);
    }
} 